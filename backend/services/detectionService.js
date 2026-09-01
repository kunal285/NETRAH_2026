import crypto from 'crypto';
import { s3Service } from './s3Service.js';
import { Detection } from '../models/Detection.js';
import { db } from '../config/db.js';
import { geminiService } from './geminiService.js';

/**
 * DetectionService
 * Persists and searches structured AI perception records:
 * - Real-time vehicle tracking & classification (CAR, MOTORCYCLE, TRUCK, BUS, BICYCLE, OTHER)
 * - ANPR (Automatic Number Plate Recognition) with Plate Crop Snapshots
 * - Emergency Ambulance visual / flasher detection
 * - Face AI recognition (Enrolled Personnel vs Unknown)
 * Handles AWS S3 multi-crop uploads and database persistence.
 */
class DetectionService {
  constructor() {
    this.detections = [];
    this.trackedVehicles = new Map(); // trackId -> { vehicleClass, firstSeen, lastSeen }
    this.stats = {
      totalDetections: 0,
      totalVehicles: 0,
      cars: 0,
      motorcycles: 0,
      trucks: 0,
      buses: 0,
      bicycles: 0,
      other: 0,
      anprPlates: 0,
      ambulances: 0,
      faces: 0,
    };

    this.recentDebounce = new Map(); // Key: `${robotId}_${type}_${info}` -> timestamp
    this.debounceMs = Number(process.env.DETECTION_IMAGE_COOLDOWN_MS || 2000);

    // Periodic cleanup of debounce cache
    setInterval(() => {
      const now = Date.now();
      for (const [key, ts] of this.recentDebounce.entries()) {
        if (now - ts > 15000) {
          this.recentDebounce.delete(key);
        }
      }
    }, 5000);
  }

  normalizeType(type = '') {
    const t = String(type).toUpperCase();
    if (t.includes('PLATE') || t.includes('ANPR')) return 'ANPR';
    if (t.includes('AMBULANCE') || t.includes('EMERGENCY')) return 'AMBULANCE';
    if (t.includes('FACE') || t.includes('PERSON') || t.includes('WARDEN')) return 'FACE';
    if (t.includes('CAR') || t.includes('BUS') || t.includes('TRUCK') || t.includes('MOTORCYCLE') || t.includes('BIKE') || t.includes('VEHICLE')) return 'VEHICLE';
    return t || 'VEHICLE';
  }

  normalizeVehicleClass(vClass = '') {
    const vc = String(vClass).toUpperCase();
    if (vc.includes('MOTORCYCLE') || vc.includes('BIKE') || vc.includes('TWO_WHEELER')) return 'MOTORCYCLE';
    if (vc.includes('TRUCK')) return 'TRUCK';
    if (vc.includes('BUS')) return 'BUS';
    if (vc.includes('BICYCLE') || vc.includes('CYCLE')) return 'BICYCLE';
    if (vc.includes('CAR') || vc.includes('AUTO') || vc.includes('SEDAN') || vc.includes('SUV')) return 'CAR';
    return 'OTHER';
  }

  _parseImageBuffer(imageInput) {
    if (!imageInput) return null;
    if (Buffer.isBuffer(imageInput)) return imageInput;
    if (typeof imageInput === 'string') {
      const cleanBase64 = imageInput.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(cleanBase64, 'base64');
    }
    return null;
  }

  /**
   * Ingest, process, upload snapshots to AWS S3, and broadcast detection event
   */
  async processAndSaveDetection(rawDetection, io = null) {
    const id = rawDetection.id || `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const robotId = (rawDetection.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-01').trim().toUpperCase();
    const type = this.normalizeType(rawDetection.type);
    const vehicleClass = this.normalizeVehicleClass(rawDetection.vehicleClass || rawDetection.class || (type === 'VEHICLE' ? rawDetection.detectionInfo : ''));
    const trackId = rawDetection.trackId !== undefined ? Number(rawDetection.trackId) : null;
    const detectionInfo = rawDetection.detectionInfo || rawDetection.result || rawDetection.label || rawDetection.plate || type;
    const confidence = Number(rawDetection.confidence !== undefined ? rawDetection.confidence : 0.92);
    const source = rawDetection.source || rawDetection.camera || rawDetection.cameraId || 'CAMERA-01';
    const timestamp = rawDetection.timestamp || new Date().toISOString();
    const plate = rawDetection.plate || (type === 'ANPR' ? detectionInfo : null) || null;
    const personId = rawDetection.personId || null;
    const personName = rawDetection.personName || (type === 'FACE' ? detectionInfo : null);

    let imageKey = rawDetection.imageKey || null;
    let imageUrl = rawDetection.imageUrl || null;
    let plateImageKey = rawDetection.plateImageKey || null;
    let plateImageUrl = rawDetection.plateImageUrl || null;
    let faceImageKey = rawDetection.faceImageKey || null;
    let faceImageUrl = rawDetection.faceImageUrl || null;
    let imageUploadStatus = rawDetection.imageUploadStatus || 'PENDING';

    // Check debounce to avoid uploading hundreds of duplicate images
    const debounceKey = `${robotId}_${type}_${trackId || detectionInfo}`;
    const lastSeen = this.recentDebounce.get(debounceKey);
    const now = Date.now();
    const shouldUpload = !lastSeen || (now - lastSeen >= this.debounceMs);
    this.recentDebounce.set(debounceKey, now);

    // 1. Upload Full Frame Snapshot
    const fullBuffer = this._parseImageBuffer(rawDetection.image || rawDetection.fullFrame);
    if (fullBuffer && shouldUpload) {
      try {
        imageUploadStatus = 'UPLOADING';
        const s3Res = await s3Service.uploadDetectionImage({
          imageBuffer: fullBuffer,
          detectionId: id,
          robotId,
          subType: 'full',
          mimeType: 'image/jpeg',
        });
        if (s3Res.uploadStatus === 'UPLOADED') {
          imageKey = s3Res.key;
          imageUrl = s3Res.url || `/api/detections/${id}/image?subType=full`;
          imageUploadStatus = 'UPLOADED';
        } else {
          imageUploadStatus = 'FAILED';
          imageUrl = `/api/detections/${id}/image?subType=full`;
        }
      } catch (err) {
        console.error(`[S3] Error uploading full image for ${id}:`, err.message);
        imageUploadStatus = 'FAILED';
      }
    }

    // 2. Upload Plate Crop Snapshot
    const plateBuffer = this._parseImageBuffer(rawDetection.plateImage || rawDetection.plateCrop);
    if (plateBuffer && shouldUpload) {
      try {
        const s3PlateRes = await s3Service.uploadDetectionImage({
          imageBuffer: plateBuffer,
          detectionId: id,
          robotId,
          subType: 'plate',
          mimeType: 'image/jpeg',
        });
        if (s3PlateRes.uploadStatus === 'UPLOADED') {
          plateImageKey = s3PlateRes.key;
          plateImageUrl = s3PlateRes.url || `/api/detections/${id}/image?subType=plate`;
        }
      } catch (err) {
        console.warn(`[S3] Plate crop upload notice:`, err.message);
      }
    }

    // 3. Upload Face Crop Snapshot
    const faceBuffer = this._parseImageBuffer(rawDetection.faceImage || rawDetection.faceCrop);
    if (faceBuffer && shouldUpload) {
      try {
        const s3FaceRes = await s3Service.uploadDetectionImage({
          imageBuffer: faceBuffer,
          detectionId: id,
          robotId,
          subType: 'face',
          mimeType: 'image/jpeg',
        });
        if (s3FaceRes.uploadStatus === 'UPLOADED') {
          faceImageKey = s3FaceRes.key;
          faceImageUrl = s3FaceRes.url || `/api/detections/${id}/image?subType=face`;
        }
      } catch (err) {
        console.warn(`[S3] Face crop upload notice:`, err.message);
      }
    }

    // Update vehicle stats tracking
    if (type === 'VEHICLE' || type === 'AMBULANCE') {
      if (trackId !== null) {
        if (!this.trackedVehicles.has(trackId)) {
          this.trackedVehicles.set(trackId, { vehicleClass, firstSeen: now, lastSeen: now });
          this.stats.totalVehicles++;
          if (vehicleClass === 'CAR') this.stats.cars++;
          else if (vehicleClass === 'MOTORCYCLE') this.stats.motorcycles++;
          else if (vehicleClass === 'TRUCK') this.stats.trucks++;
          else if (vehicleClass === 'BUS') this.stats.buses++;
          else if (vehicleClass === 'BICYCLE') this.stats.bicycles++;
          else this.stats.other++;
        }
      } else {
        this.stats.totalVehicles++;
      }
    }

    if (type === 'ANPR') this.stats.anprPlates++;
    if (type === 'AMBULANCE') this.stats.ambulances++;
    if (type === 'FACE') this.stats.faces++;
    this.stats.totalDetections++;

    const detectionRecord = {
      id,
      robotId,
      type,
      vehicleClass: type === 'VEHICLE' || type === 'AMBULANCE' ? vehicleClass : null,
      trackId,
      detectionInfo,
      plate,
      personId,
      personName,
      confidence: Number(confidence.toFixed(2)),
      source,
      timestamp,
      imageKey,
      imageUrl: imageUrl || (imageKey ? `/api/detections/${id}/image?subType=full` : null),
      plateImageKey,
      plateImageUrl: plateImageUrl || (plateImageKey ? `/api/detections/${id}/image?subType=plate` : null),
      faceImageKey,
      faceImageUrl: faceImageUrl || (faceImageKey ? `/api/detections/${id}/image?subType=face` : null),
      imageUploadStatus,
      details: rawDetection.details || {},
      isDemo: Boolean(rawDetection.isDemo),
    };

    // Store in-memory buffer (limit 500)
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
          vehicleClass,
          trackId,
          result: detectionInfo,
          confidence,
          cameraSource: source,
          timestamp: new Date(timestamp),
          imageKey,
          imageUrl: detectionRecord.imageUrl,
          plateImageKey,
          plateImageUrl: detectionRecord.plateImageUrl,
          faceImageKey,
          faceImageUrl: detectionRecord.faceImageUrl,
          imageUploadStatus,
          isDemo: detectionRecord.isDemo,
          details: {
            ...detectionRecord.details,
            plateNumber: plate,
            personId,
            personName,
          },
        });
        console.log(`[DB] Detection saved: ${id} (${type} - ${detectionInfo})`);
      } catch (dbErr) {
        console.warn(`[DB] Fallback save warning: ${dbErr.message}`);
      }
    }

    // Broadcast over Socket.IO
    if (io) {
      io.emit('detection:new', detectionRecord);
      io.emit('ai:detection', detectionRecord);
      io.emit('robot:detection', detectionRecord);
      io.emit('vehicle:count', this.stats);

      if (type === 'AMBULANCE') {
        io.emit('ambulance:detected', detectionRecord);
        io.emit('ai:ambulance_alert', detectionRecord);
      } else if (type === 'ANPR') {
        io.emit('anpr:detected', detectionRecord);
        io.emit('ai:anpr', detectionRecord);
      } else if (type === 'FACE') {
        io.emit('face:detected', detectionRecord);
      } else if (type === 'VEHICLE') {
        io.emit('vehicle:detected', detectionRecord);
      }

      // Event-driven asynchronous Gemini AI Intelligence trigger (non-blocking)
      if (type === 'AMBULANCE' || type === 'ANPR' || (type === 'VEHICLE' && this.stats.totalVehicles % 10 === 0)) {
        geminiService
          .analyzeEvent({
            event_id: id,
            event_type: type === 'AMBULANCE' ? 'ambulance_detected' : type === 'ANPR' ? 'unknown_plate' : 'traffic_congestion',
            robot_id: robotId,
            timestamp,
            ambulance_detected: type === 'AMBULANCE',
            ambulance_confidence: type === 'AMBULANCE' ? confidence : null,
            plates: plate ? [{ text: plate, confidence }] : [],
            faces: personId ? [{ personId, personName, confidence }] : [],
            vehicle_counts: this.stats,
            recent_detections: this.detections.slice(0, 5),
          })
          .then((aiIncident) => {
            if (aiIncident && io) {
              io.emit('ai:incident', aiIncident);
              io.emit('ai:analysis', aiIncident);
              if (aiIncident.severity === 'high' || aiIncident.severity === 'critical') {
                io.emit('ai:alert', aiIncident);
              }
            }
          })
          .catch((err) => {
            console.warn(`[AI INTELLIGENCE] Event analysis notice: ${err.message}`);
          });
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

    if (filterType !== 'ALL') {
      results = results.filter((d) => d.type === filterType);
    }

    if (searchQuery) {
      results = results.filter((d) => {
        const dInfo = (d.detectionInfo || '').toLowerCase();
        const dPlate = (d.plate || '').toLowerCase();
        const dType = (d.type || '').toLowerCase();
        const dSrc = (d.source || '').toLowerCase();
        const dPerson = (d.personName || '').toLowerCase();
        return (
          dInfo.includes(searchQuery) ||
          dPlate.includes(searchQuery) ||
          dType.includes(searchQuery) ||
          dSrc.includes(searchQuery) ||
          dPerson.includes(searchQuery)
        );
      });
    }

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = results.length;
    const start = (page - 1) * limit;
    const paginated = results.slice(start, start + limit);

    return {
      success: true,
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats: this.getStats(),
    };
  }

  getStats() {
    return {
      ...this.stats,
      total: this.stats.totalDetections,
      anpr: this.stats.anprPlates,
      ambulance: this.stats.ambulances,
      vehicle: this.stats.totalVehicles,
      face: this.stats.faces,
    };
  }

  getDetectionById(id) {
    return this.detections.find((d) => d.id === id);
  }

  async clearDetections() {
    const s3Keys = [];
    for (const d of this.detections) {
      if (d.imageKey) s3Keys.push(d.imageKey);
      if (d.plateImageKey) s3Keys.push(d.plateImageKey);
      if (d.faceImageKey) s3Keys.push(d.faceImageKey);
    }

    if (s3Keys.length > 0) {
      try {
        console.log(`[S3] Deleting ${s3Keys.length} detection images on Clear Log...`);
        await s3Service.deleteDetectionImages(s3Keys);
      } catch (err) {
        console.warn(`[S3] Clear log S3 deletion notice:`, err.message);
      }
    }

    this.detections = [];
    this.trackedVehicles.clear();
    this.stats = {
      totalDetections: 0,
      totalVehicles: 0,
      cars: 0,
      motorcycles: 0,
      trucks: 0,
      buses: 0,
      bicycles: 0,
      other: 0,
      anprPlates: 0,
      ambulances: 0,
      faces: 0,
    };

    if (db.getStatus().connected) {
      try {
        await Detection.deleteMany({});
      } catch (err) {
        console.warn(`[DB] Clear log DB deletion notice:`, err.message);
      }
    }

    return { success: true, message: 'All detection records and S3 images cleared' };
  }
}

export const detectionService = new DetectionService();
