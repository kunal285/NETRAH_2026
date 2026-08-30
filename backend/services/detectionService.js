import crypto from 'crypto';
import { s3Service } from './s3Service.js';
import { Detection } from '../models/Detection.js';
import { db } from '../config/db.js';

/**
 * DetectionService
 * Persists and searches structured AI perception records:
 * - ANPR (Automatic Number Plate Recognition)
 * - Emergency Ambulance siren/visual detections
 * - Traffic vehicle types (Car, Bus, Bike, Truck)
 * - Pedestrian & human crosswalk events
 * Handles S3 uploads and database indexing.
 */
class DetectionService {
  constructor() {
    this.detections = [];
    this.recentDebounce = new Map(); // Key: `${type}_${info}` -> timestamp
    this.debounceMs = Number(process.env.DETECTION_IMAGE_COOLDOWN_MS || 2000);

    // Periodic cleanup of debounce cache
    setInterval(() => {
      const now = Date.now();
      for (const [key, ts] of this.recentDebounce.entries()) {
        if (now - ts > 10000) {
          this.recentDebounce.delete(key);
        }
      }
    }, 5000);
  }

  /**
   * Normalize detection type to uppercase standard:
   * VEHICLE, AMBULANCE, ANPR, FACE, PEDESTRIAN
   */
  normalizeType(type = '') {
    const t = String(type).toUpperCase();
    if (t.includes('PLATE') || t.includes('ANPR')) return 'ANPR';
    if (t.includes('AMBULANCE') || t.includes('EMERGENCY')) return 'AMBULANCE';
    if (t.includes('FACE') || t.includes('PERSON') || t.includes('WARDEN')) return 'FACE';
    if (t.includes('CAR') || t.includes('BUS') || t.includes('TRUCK') || t.includes('MOTORCYCLE') || t.includes('VEHICLE')) return 'VEHICLE';
    return t || 'VEHICLE';
  }

  /**
   * Ingest and persist detection event with S3 image storage
   */
  async processAndSaveDetection(rawDetection, io = null) {
    const id = rawDetection.id || `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const robotId = (rawDetection.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-01').trim().toUpperCase();
    const type = this.normalizeType(rawDetection.type);
    const detectionInfo = rawDetection.detectionInfo || rawDetection.result || rawDetection.label || rawDetection.details?.plateNumber || type;
    const confidence = Number(rawDetection.confidence !== undefined ? rawDetection.confidence : 0.92);
    const source = rawDetection.source || rawDetection.camera || rawDetection.cameraId || 'CAMERA-01';
    const timestamp = rawDetection.timestamp || new Date().toISOString();
    const plate = rawDetection.plate || (type === 'ANPR' ? detectionInfo : null) || rawDetection.details?.plateNumber || null;
    const location = rawDetection.location || 'Chowk 01';

    let imageKey = rawDetection.imageKey || null;
    let imageUrl = rawDetection.imageUrl || null;
    let imageUploadStatus = rawDetection.imageUploadStatus || 'PENDING';

    // Check debounce to avoid uploading hundreds of identical frames in a short window
    const debounceKey = `${robotId}_${type}_${detectionInfo}`;
    const lastSeen = this.recentDebounce.get(debounceKey);
    const now = Date.now();
    const shouldUploadImage = !lastSeen || (now - lastSeen >= this.debounceMs);
    this.recentDebounce.set(debounceKey, now);

    // Handle base64 or buffer image upload to AWS S3
    if (rawDetection.image && shouldUploadImage) {
      try {
        imageUploadStatus = 'UPLOADING';
        let buffer = null;
        if (Buffer.isBuffer(rawDetection.image)) {
          buffer = rawDetection.image;
        } else if (typeof rawDetection.image === 'string') {
          const cleanBase64 = rawDetection.image.replace(/^data:image\/\w+;base64,/, '');
          buffer = Buffer.from(cleanBase64, 'base64');
        }

        if (buffer) {
          console.log(`[AI] Detection generated: ${type} - ${detectionInfo} (${Math.round(confidence * 100)}%)`);
          const s3Result = await s3Service.uploadDetectionImage({
            imageBuffer: buffer,
            detectionId: id,
            robotId,
            mimeType: 'image/jpeg',
          });

          if (s3Result.uploadStatus === 'UPLOADED') {
            imageKey = s3Result.key;
            imageUrl = s3Result.url || `/api/detections/${id}/image`;
            imageUploadStatus = 'UPLOADED';
          } else {
            imageUploadStatus = 'FAILED';
            imageUrl = `/api/detections/${id}/image`;
          }
        }
      } catch (err) {
        console.error(`[S3] Error processing detection image:`, err.message);
        imageUploadStatus = 'FAILED';
      }
    } else if (!imageKey && rawDetection.imageUrl) {
      imageUrl = rawDetection.imageUrl;
      imageUploadStatus = 'UPLOADED';
    }

    const detectionRecord = {
      id,
      robotId,
      type,
      detectionInfo,
      confidence: Number(confidence.toFixed(2)),
      source,
      timestamp,
      imageKey,
      imageUrl: imageUrl || (imageKey ? `/api/detections/${id}/image` : null),
      plate,
      location,
      imageUploadStatus,
      details: rawDetection.details || {},
      isDemo: Boolean(rawDetection.isDemo),
    };

    // Store in-memory buffer
    this.detections.unshift(detectionRecord);
    if (this.detections.length > 500) {
      this.detections = this.detections.slice(0, 500);
    }

    // Persist to MongoDB if connected
    if (db.getStatus().connected) {
      try {
        await Detection.create({
          _id: id,
          robotId,
          type: type.toLowerCase(),
          result: detectionInfo,
          confidence,
          cameraSource: source,
          timestamp: new Date(timestamp),
          imageKey,
          imageUrl: detectionRecord.imageUrl,
          imageUploadStatus,
          isDemo: detectionRecord.isDemo,
          details: {
            ...detectionRecord.details,
            plateNumber: plate,
          },
        });
        console.log(`[DB] Detection saved: ${id} (${type})`);
      } catch (dbErr) {
        console.warn(`[DB] Fallback save warning (Detection stored in memory): ${dbErr.message}`);
      }
    }

    // Broadcast over Socket.IO
    if (io) {
      console.log(`[SOCKET] Emitting detection:new for ${id} (${type})`);
      io.emit('detection:new', detectionRecord);
      io.emit('ai:detection', detectionRecord);
      io.emit('robot:detection', detectionRecord);

      if (type === 'AMBULANCE') {
        io.emit('ambulance:detected', detectionRecord);
        io.emit('ai:ambulance_alert', detectionRecord);
      } else if (type === 'ANPR') {
        io.emit('anpr:detected', detectionRecord);
        io.emit('ai:anpr', detectionRecord);
      } else if (type === 'VEHICLE') {
        io.emit('vehicle:detected', detectionRecord);
      }
    }

    return detectionRecord;
  }

  /**
   * Query detections with filtering, search, pagination, and stats
   */
  async getDetections(options = {}) {
    const page = Math.max(1, parseInt(options.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(options.limit || '10', 10)));
    const filterType = options.type ? String(options.type).toUpperCase() : 'ALL';
    const searchQuery = options.search ? String(options.search).trim().toLowerCase() : '';

    let results = [...this.detections];

    // Filter by type
    if (filterType !== 'ALL') {
      results = results.filter((d) => d.type === filterType);
    }

    // Filter by search query (plate, type, detectionInfo, source)
    if (searchQuery) {
      results = results.filter((d) => {
        const dInfo = (d.detectionInfo || '').toLowerCase();
        const dPlate = (d.plate || '').toLowerCase();
        const dType = (d.type || '').toLowerCase();
        const dSrc = (d.source || '').toLowerCase();
        return (
          dInfo.includes(searchQuery) ||
          dPlate.includes(searchQuery) ||
          dType.includes(searchQuery) ||
          dSrc.includes(searchQuery)
        );
      });
    }

    // Sorting
    if (options.sortBy === 'time_asc') {
      results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else if (options.sortBy === 'confidence_desc') {
      results.sort((a, b) => b.confidence - a.confidence);
    } else {
      // Default: newest first
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    const total = results.length;
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    const stats = this.getStats();

    return {
      success: true,
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats,
    };
  }

  /**
   * Return dynamic count stats
   */
  getStats() {
    return {
      total: this.detections.length,
      anpr: this.detections.filter((d) => d.type === 'ANPR').length,
      ambulance: this.detections.filter((d) => d.type === 'AMBULANCE').length,
      vehicle: this.detections.filter((d) => d.type === 'VEHICLE').length,
      face: this.detections.filter((d) => d.type === 'FACE').length,
    };
  }

  /**
   * Find single detection by ID
   */
  getDetectionById(id) {
    return this.detections.find((d) => d.id === id);
  }

  /**
   * Clear all detections: deletes S3 objects and database records
   */
  async clearDetections() {
    const s3Keys = this.detections
      .map((d) => d.imageKey)
      .filter((k) => typeof k === 'string' && k.length > 0);

    // Delete S3 images
    if (s3Keys.length > 0) {
      try {
        console.log(`[S3] Deleting ${s3Keys.length} detection images on Clear Log...`);
        await s3Service.deleteDetectionImages(s3Keys);
      } catch (err) {
        console.warn(`[S3] Clear log S3 deletion warning:`, err.message);
      }
    }

    // Clear in-memory buffer
    this.detections = [];

    // Clear database collection if connected
    if (db.getStatus().connected) {
      try {
        await Detection.deleteMany({});
      } catch (err) {
        console.warn(`[DB] Clear log DB deletion warning:`, err.message);
      }
    }

    return { success: true, message: 'Detection records and S3 images cleared' };
  }
}

export const detectionService = new DetectionService();
