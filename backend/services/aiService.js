import { detectionService } from './detectionService.js';
import { EventEmitter } from 'events';

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

  triggerSyntheticDetection(type) {
    let detection;
    const now = new Date().toISOString();

    switch (type) {
      case 'ambulance':
        detection = {
          id: `amb-${Date.now()}`,
          timestamp: now,
          type: 'ambulance',
          result: 'Emergency 108 Ambulance Approaching',
          confidence: +(0.92 + Math.random() * 0.07).toFixed(2),
          camera: 'front_1080p',
          details: {
            sirenDetected: true,
            corridorPriority: 'CRITICAL',
            bbox: [30, 25, 40, 50],
          },
          status: 'ACTIVE_CORRIDOR',
        };
        this.activeAmbulance = detection;
        this.emit('ambulance_alert', detection);
        break;

      case 'anpr': {
        const plates = [
          { plate: 'MH12RN4590', state: 'Maharashtra' },
          { plate: 'DL01AB9876', state: 'Delhi' },
          { plate: 'KA03MJ2024', state: 'Karnataka' },
          { plate: 'UP32EF5511', state: 'Uttar Pradesh' },
          { plate: 'HR26DK7744', state: 'Haryana' },
        ];
        const randomPlate = plates[Math.floor(Math.random() * plates.length)];

        detection = {
          id: `anpr-${Date.now()}`,
          timestamp: now,
          type: 'anpr',
          result: `Plate: ${randomPlate.plate} (${randomPlate.state})`,
          confidence: +(0.91 + Math.random() * 0.08).toFixed(2),
          camera: 'front_1080p',
          details: {
            plateNumber: randomPlate.plate,
            plateState: randomPlate.state,
            vehicleType: 'SEDAN',
            bbox: [22, 45, 30, 22],
          },
          status: 'VERIFIED',
        };
        break;
      }

      case 'vehicle': {
        const types = ['CAR', 'SUV', 'BUS', 'TRUCK', 'MOTORCYCLE'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        detection = {
          id: `veh-${Date.now()}`,
          timestamp: now,
          type: 'vehicle',
          result: `Classified ${chosen} in Lane 1`,
          confidence: +(0.85 + Math.random() * 0.12).toFixed(2),
          camera: 'front_1080p',
          details: {
            vehicleType: chosen,
            bbox: [40, 30, 35, 40],
          },
          status: 'LOGGED',
        };
        break;
      }

      case 'face':
      default:
        detection = {
          id: `face-${Date.now()}`,
          timestamp: now,
          type: 'face',
          result: 'Traffic Constable / Pedestrian',
          confidence: +(0.88 + Math.random() * 0.10).toFixed(2),
          camera: 'front_1080p',
          details: {
            personLabel: 'Pedestrian Crosswalk',
            bbox: [15, 30, 20, 45],
          },
          status: 'VERIFIED',
        };
        break;
    }

    const saved = detectionService.addDetection(detection);
    this.emit('detection', saved);
    return saved;
  }
}

export const aiService = new AIService();
