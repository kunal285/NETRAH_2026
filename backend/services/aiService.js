import { detectionService } from './detectionService.js';
import { EventEmitter } from 'events';
import { s3Storage } from '../storage/s3Storage.js';
import { generateS3Key } from '../routes/storage.js';
import { StoredImage } from '../models/StoredImage.js';
import { db } from '../config/db.js';
import crypto from 'crypto';

/**
 * AIService
 * Simulates intelligent multi-modal vision perception:
 * - ANPR Number Plate OCR
 * - Emergency Ambulance siren/flasher detection & green corridor trigger
 * - Traffic classification (Car, Bike, Bus, Truck)
 * - Pedestrian crossing safety
 */
class AIService extends EventEmitter {
  constructor() {
    super();
    this.activeAmbulance = null;
  }

  getActiveAmbulance() {
    return this.activeAmbulance;
  }

  acknowledgeAmbulance() {
    this.activeAmbulance = null;
    this.emit('ambulance_cleared');
    return { success: true };
  }

  async _uploadSyntheticImage(imageType, robotId = 'PRAHARI-MK1') {
    try {
      const buffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
      const extension = 'jpg';
      const mimeType = 'image/jpeg';
      const imageId = crypto.randomUUID();
      const s3Key = generateS3Key(imageType, robotId, extension);
      
      await s3Storage.upload(buffer, s3Key, mimeType);
      
      const bucketName = process.env.IMAGE_STORAGE_BUCKET;
      const imageData = {
        imageId,
        robotId,
        cameraSource: 'demo',
        imageType,
        storageKey: s3Key,
        imageUrl: `/api/storage/image/${imageId}`,
        mimeType,
        fileSize: buffer.length,
        isDemo: true,
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
      console.error('[AIService] S3 mock upload error:', err.message);
      return null;
    }
  }

  async triggerSyntheticDetection(type) {
    let detection;
    const now = new Date().toISOString();
    const robotId = 'PRAHARI-MK1';

    switch (type) {
      case 'ambulance': {
        const storedImage = await this._uploadSyntheticImage('ambulance', robotId);
        const snapshotUrl = storedImage ? storedImage.imageUrl : null;
        
        detection = {
          id: `amb-${Date.now()}`,
          timestamp: now,
          type: 'ambulance',
          result: 'Emergency 108 Ambulance Approaching',
          confidence: +(0.92 + Math.random() * 0.07).toFixed(2),
          camera: 'front_1080p',
          snapshotUrl,
          details: {
            sirenDetected: true,
            corridorPriority: 'CRITICAL',
            bbox: [30, 25, 40, 50],
            snapshotUrl,
          },
          status: 'ACTIVE_CORRIDOR',
        };
        this.activeAmbulance = detection;
        this.emit('ambulance_alert', detection);
        break;
      }

      case 'anpr': {
        const plates = [
          { plate: 'MH12RN4590', state: 'Maharashtra' },
          { plate: 'DL01AB9876', state: 'Delhi' },
          { plate: 'KA03MJ2024', state: 'Karnataka' },
          { plate: 'UP32EF5511', state: 'Uttar Pradesh' },
          { plate: 'HR26DK7744', state: 'Haryana' },
        ];
        const randomPlate = plates[Math.floor(Math.random() * plates.length)];

        const storedImage = await this._uploadSyntheticImage('number plate', robotId);
        const snapshotUrl = storedImage ? storedImage.imageUrl : null;
        const imageId = storedImage ? storedImage.imageId : null;

        detection = {
          id: `anpr-${Date.now()}`,
          timestamp: now,
          type: 'anpr',
          result: `Plate: ${randomPlate.plate} (${randomPlate.state})`,
          confidence: +(0.91 + Math.random() * 0.08).toFixed(2),
          camera: 'front_1080p',
          snapshotUrl,
          details: {
            plateNumber: randomPlate.plate,
            plateState: randomPlate.state,
            vehicleType: 'SEDAN',
            bbox: [22, 45, 30, 22],
            snapshotUrl,
            imageId,
          },
          status: 'VERIFIED',
        };
        break;
      }

      case 'vehicle': {
        const types = ['CAR', 'SUV', 'BUS', 'TRUCK', 'MOTORCYCLE'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        
        const storedImage = await this._uploadSyntheticImage('uploads', robotId);
        const snapshotUrl = storedImage ? storedImage.imageUrl : null;

        detection = {
          id: `veh-${Date.now()}`,
          timestamp: now,
          type: 'vehicle',
          result: `Classified ${chosen} in Lane 1`,
          confidence: +(0.85 + Math.random() * 0.12).toFixed(2),
          camera: 'front_1080p',
          snapshotUrl,
          details: {
            vehicleType: chosen,
            bbox: [40, 30, 35, 40],
            snapshotUrl,
          },
          status: 'LOGGED',
        };
        break;
      }

      case 'face':
      default: {
        const storedImage = await this._uploadSyntheticImage('face', robotId);
        const snapshotUrl = storedImage ? storedImage.imageUrl : null;

        detection = {
          id: `face-${Date.now()}`,
          timestamp: now,
          type: 'face',
          result: 'Traffic Constable / Pedestrian',
          confidence: +(0.88 + Math.random() * 0.10).toFixed(2),
          camera: 'front_1080p',
          snapshotUrl,
          details: {
            personLabel: 'Pedestrian Crosswalk',
            bbox: [15, 30, 20, 45],
            snapshotUrl,
          },
          status: 'VERIFIED',
        };
        break;
      }
    }

    const saved = detectionService.addDetection(detection);
    this.emit('detection', saved);
    return saved;
  }
}

export const aiService = new AIService();
