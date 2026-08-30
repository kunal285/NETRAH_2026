import { EventEmitter } from 'events';
import crypto from 'crypto';
import { db } from '../../config/db.js';
import { AiEvent } from '../../models/AiEvent.js';
import { NumberPlate } from '../../models/NumberPlate.js';
import { s3Storage } from '../../storage/s3Storage.js';
import { generateS3Key } from '../../utils/storageUtils.js';
import { StoredImage } from '../../models/StoredImage.js';

import { ModelService } from './modelService.js';
import { AudioProcessor } from './audioProcessor.js';
import { detectionService } from '../detectionService.js';

class InferenceService extends EventEmitter {
  constructor() {
    super();
    this.modelService = new ModelService();
    this.audioProcessor = new AudioProcessor();
    
    this.aiOnline = true;
    this.lastInferenceLatencyMs = 0;
    this.activeAmbulance = null;
    this.recentPlatesCooldown = new Map();
    this.inMemoryEvents = [];
    this.inMemoryAnpr = [];
    
    this.inMemoryTrafficStats = {
      total_vehicles: 0,
      total_counted_cumulative: 0,
      cars: 0,
      motorcycles: 0,
      buses: 0,
      trucks: 0,
      pedestrians: 0,
      plates_detected: 0,
      lane_occupancy: { 'Lane 1': 0, 'Lane 2': 0, 'Lane 3': 0, 'Lane 4': 0 },
      congestion_level: 'LOW',
    };

    // Periodic cleanup of plate cooldown map (5 seconds)
    setInterval(() => {
      const now = Date.now();
      for (const [plate, timestamp] of this.recentPlatesCooldown.entries()) {
        if (now - timestamp > 5000) {
          this.recentPlatesCooldown.delete(plate);
        }
      }
    }, 2000);
  }

  checkHealth() {
    return true; // Internally integrated and always online
  }

  getStatus() {
    return {
      aiOnline: this.aiOnline,
      serviceUrl: "internal://local-ai-module",
      latencyMs: this.lastInferenceLatencyMs,
      activeAmbulance: this.activeAmbulance,
      trafficStats: this.inMemoryTrafficStats,
    };
  }

  async processFrame(payload, io) {
    const start = Date.now();
    
    let imageNp = null;
    if (payload.image) {
      imageNp = this.modelService.decodeImage(payload.image);
    }

    // Call the local ModelService directly
    const result = this.modelService.detect(
      imageNp,
      payload.lanes,
      payload.siren_confidence || 0.0,
      payload.hint_detections
    );

    this.lastInferenceLatencyMs = Date.now() - start;
    result.performance.inference_latency_ms = this.lastInferenceLatencyMs;
    result.camera_id = payload.camera_id || "CAM-01";

    // Update internal traffic statistics
    if (result.counts) {
      this.inMemoryTrafficStats = {
        ...this.inMemoryTrafficStats,
        ...result.counts,
        lane_occupancy: result.lane_occupancy || this.inMemoryTrafficStats.lane_occupancy,
        congestion_level: result.traffic_density || 'LOW',
      };
    }

    // Handle S3 uploads, Mongoose persistence & Socket broadcasts
    await this._handleEvents(result, payload, io);

    return result;
  }

  async analyzeAudio(audioBuffer, sampleRate = 44100) {
    return this.audioProcessor.analyzeAudioBuffer(audioBuffer, sampleRate);
  }

  async _uploadPayloadImage(payload, imageType) {
    if (!payload?.image) return null;
    try {
      const base64Data = payload.image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const extension = 'jpg';
      const mimeType = 'image/jpeg';
      const imageId = crypto.randomUUID();
      const robotId = payload.camera_id || 'PRAHARI-01';
      const s3Key = generateS3Key(imageType, robotId, extension);
      
      await s3Storage.upload(buffer, s3Key, mimeType);
      
      const bucketName = process.env.IMAGE_STORAGE_BUCKET;
      const imageData = {
        imageId,
        robotId,
        cameraSource: payload.isDemo ? 'demo' : 'device',
        imageType,
        storageKey: s3Key,
        imageUrl: `/api/storage/image/${imageId}`,
        mimeType,
        fileSize: buffer.length,
        isDemo: Boolean(payload.isDemo),
        imageKey: s3Key,
        storage: 's3',
        bucket: bucketName,
        contentType: mimeType,
      };

      if (db.getStatus().connected) {
        await StoredImage.create(imageData);
      }
      return imageData;
    } catch (err) {
      console.error('[InferenceService] S3 upload error:', err.message);
      return null;
    }
  }

  async _handleEvents(result, payload, io) {
    const isDemo = Boolean(payload?.isDemo);
    const cameraId = payload?.camera_id || 'CAM-01';

    // 1. Ambulance Event
    if (result.emergency_ambulance && result.emergency_ambulance.is_emergency) {
      const amb = result.emergency_ambulance;
      const storedImage = await this._uploadPayloadImage(payload, 'ambulance');
      const snapshotUrl = storedImage ? storedImage.imageUrl : null;

      this.activeAmbulance = {
        ...amb,
        timestamp: result.timestamp || new Date().toISOString(),
        snapshotUrl,
      };

      const eventObj = {
        eventId: `amb-${crypto.randomUUID()}`,
        type: 'AMBULANCE_DETECTED',
        timestamp: new Date(),
        cameraId,
        confidence: amb.combined_confidence || 0.95,
        objectClass: 'ambulance',
        lane: amb.lane,
        snapshotUrl,
        metadata: {
          direction: amb.direction,
          distanceMeters: amb.distance_meters,
          sirenConfidence: amb.siren_confidence,
          visualConfidence: amb.confidence,
          status: amb.status,
          snapshotUrl,
        },
        isDemo,
      };

      await this._saveEvent(eventObj);
      if (io) {
        io.emit('ai:event', eventObj);
        io.emit('ai:ambulance_alert', this.activeAmbulance);
      }
    }

    // 2. ANPR Plates Event
    if (result.plates && result.plates.length > 0) {
      for (const p of result.plates) {
        const plateData = p.plate || {};
        const plateNumber = plateData.text || p.result || 'MH12AB1234';

        if (plateNumber && plateNumber !== 'UNREADABLE') {
          const lastSeen = this.recentPlatesCooldown.get(plateNumber);
          const isDuplicate = lastSeen && Date.now() - lastSeen < 5000;

          if (!isDuplicate) {
            this.recentPlatesCooldown.set(plateNumber, Date.now());
            const storedImage = await this._uploadPayloadImage(payload, 'number plate');
            const snapshotUrl = storedImage ? storedImage.imageUrl : null;
            const imageId = storedImage ? storedImage.imageId : null;

            const anprEvent = {
              eventId: `plate-${crypto.randomUUID()}`,
              type: 'PLATE_DETECTED',
              timestamp: new Date(),
              cameraId,
              confidence: plateData.confidence || 0.94,
              objectClass: 'license_plate',
              bbox: p.bbox || [],
              lane: p.lane || 'Lane 1',
              snapshotUrl,
              metadata: {
                plateNumber,
                state: plateData.state || 'Maharashtra',
                vehicleType: p.class_name || 'CAR',
                isValid: plateData.is_valid !== false,
                snapshotUrl,
                imageId,
              },
              isDemo,
            };

            await this._saveEvent(anprEvent);
            await this._saveAnprRecord(anprEvent);

            if (io) {
              io.emit('ai:event', anprEvent);
              io.emit('ai:anpr', anprEvent);
            }
          }
        }
      }
    }

    // 3. Crosswalk Safety Risk Event
    if (result.crosswalk_safety && result.crosswalk_safety.risk_level === 'VIOLATION / RISK') {
      const risk = result.crosswalk_safety;
      const storedImage = await this._uploadPayloadImage(payload, 'detection evidence');
      const snapshotUrl = storedImage ? storedImage.imageUrl : null;

      const riskEvent = {
        eventId: `risk-${crypto.randomUUID()}`,
        type: 'CROSSWALK_RISK',
        timestamp: new Date(),
        cameraId,
        confidence: risk.score || 0.92,
        objectClass: 'pedestrian_crosswalk',
        snapshotUrl,
        metadata: {
          riskLevel: risk.risk_level,
          inCrosswalkCount: risk.in_crosswalk_count,
          approachingVehicles: risk.approaching_vehicles,
          message: risk.message,
          snapshotUrl,
        },
        isDemo,
      };

      await this._saveEvent(riskEvent);
      if (io) {
        io.emit('ai:event', riskEvent);
        io.emit('ai:crosswalk_risk', riskEvent);
      }
    }

    // 4. Unified Detection Service Bridge
    if (result.objects && result.objects.length > 0) {
      for (const obj of result.objects) {
        detectionService.processAndSaveDetection(
          {
            robotId: cameraId,
            type: obj.class_name === 'plate' ? 'ANPR' : obj.class_name === 'ambulance' ? 'AMBULANCE' : 'VEHICLE',
            vehicleClass: obj.class_name,
            trackId: obj.track_id,
            detectionInfo: obj.plate?.text || obj.class_name,
            confidence: obj.confidence || 0.92,
            plate: obj.plate?.text || null,
            image: payload?.image || null,
            isDemo,
          },
          io
        ).catch(() => {});
      }
    }

    // 5. Traffic Density Real-time Broadcast
    if (io) {
      io.emit('ai:traffic_update', {
        counts: this.inMemoryTrafficStats,
        lane_occupancy: result.lane_occupancy,
        density: result.traffic_density || 'LOW',
        performance: result.performance,
      });
    }
  }

  async _saveEvent(eventData) {
    this.inMemoryEvents.unshift(eventData);
    if (this.inMemoryEvents.length > 200) {
      this.inMemoryEvents = this.inMemoryEvents.slice(0, 200);
    }
    if (db.getStatus().connected) {
      try {
        await AiEvent.create(eventData);
      } catch (err) {
        console.warn('[InferenceService] DB save event error:', err.message);
      }
    }
  }

  async _saveAnprRecord(anprEvent) {
    const record = {
      id: anprEvent.eventId,
      timestamp: anprEvent.timestamp,
      plateNumber: anprEvent.metadata.plateNumber,
      state: anprEvent.metadata.state,
      vehicleType: anprEvent.metadata.vehicleType,
      confidence: anprEvent.confidence,
      cameraId: anprEvent.cameraId,
      lane: anprEvent.lane,
      isDemo: anprEvent.isDemo,
      originalImageId: anprEvent.metadata.imageId || null,
    };

    this.inMemoryAnpr.unshift(record);
    if (this.inMemoryAnpr.length > 200) {
      this.inMemoryAnpr = this.inMemoryAnpr.slice(0, 200);
    }

    if (db.getStatus().connected) {
      try {
        await NumberPlate.create({
          plateNumber: record.plateNumber,
          confidence: record.confidence,
          vehicleType: record.vehicleType,
          detectionId: record.id,
          robotId: record.cameraId,
          timestamp: record.timestamp,
          isDemo: record.isDemo,
          originalImageId: record.originalImageId,
        });
      } catch (err) {
        console.warn('[InferenceService] DB save ANPR error:', err.message);
      }
    }
  }

  getEvents(filter = {}) {
    let list = [...this.inMemoryEvents];
    if (filter.type && filter.type !== 'all') {
      list = list.filter((e) => e.type.toLowerCase().includes(filter.type.toLowerCase()));
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (e) =>
          e.type.toLowerCase().includes(q) ||
          (e.metadata?.plateNumber && e.metadata.plateNumber.toLowerCase().includes(q)) ||
          (e.metadata?.message && e.metadata.message.toLowerCase().includes(q))
      );
    }
    return list.slice(0, filter.limit || 50);
  }

  getAnprList(filter = {}) {
    let list = [...this.inMemoryAnpr];
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.plateNumber.toLowerCase().includes(q) ||
          p.state.toLowerCase().includes(q) ||
          p.vehicleType.toLowerCase().includes(q)
      );
    }
    if (filter.state && filter.state !== 'all') {
      list = list.filter((p) => p.state.toLowerCase().includes(filter.state.toLowerCase()));
    }
    return list;
  }

  clearEvents() {
    this.inMemoryEvents = [];
    this.inMemoryAnpr = [];
    this.activeAmbulance = null;
    return { success: true };
  }

  acknowledgeAmbulance() {
    this.activeAmbulance = null;
    return { success: true, message: 'Ambulance green corridor cleared' };
  }
}

export const inferenceService = new InferenceService();
