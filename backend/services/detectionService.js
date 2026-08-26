/**
 * DetectionService
 * Persists and searches structured AI perception records:
 * - ANPR (Automatic Number Plate Recognition)
 * - Emergency Ambulance siren/visual detections
 * - Traffic vehicle types (Car, Bus, Bike, Truck)
 * - Pedestrian & human crosswalk events
 */
class DetectionService {
  constructor() {
    this.detections = [];

    // Seed realistic traffic perception events
    this.seedInitialDetections();
  }

  seedInitialDetections() {
    const mockSeed = [
      {
        id: 'det-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        type: 'anpr',
        result: 'Plate: MH12AB1234 (Maharashtra)',
        confidence: 0.94,
        camera: 'front_1080p',
        details: {
          plateNumber: 'MH12AB1234',
          vehicleType: 'SEDAN',
          plateState: 'Maharashtra',
          bbox: [18, 42, 34, 28],
        },
        status: 'VERIFIED',
      },
      {
        id: 'det-002',
        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        type: 'vehicle',
        result: 'Heavy Transport Truck (Lane 2)',
        confidence: 0.88,
        camera: 'front_1080p',
        details: {
          vehicleType: 'TRUCK',
          color: 'Blue',
          bbox: [48, 22, 42, 55],
        },
        status: 'LOGGED',
      },
      {
        id: 'det-003',
        timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        type: 'ambulance',
        result: 'Emergency Ambulance Detected (Siren & Flashers)',
        confidence: 0.96,
        camera: 'front_1080p',
        details: {
          sirenDetected: true,
          corridorPriority: 'HIGH',
          bbox: [28, 30, 44, 48],
        },
        status: 'ACTIVE_CORRIDOR',
      },
      {
        id: 'det-004',
        timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
        type: 'face',
        result: 'Traffic Police Officer / Pedestrian Crosswalk',
        confidence: 0.91,
        camera: 'front_1080p',
        details: {
          personLabel: 'Traffic Warden',
          bbox: [10, 35, 20, 50],
        },
        status: 'VERIFIED',
      },
    ];

    this.detections = mockSeed;
  }

  addDetection(detection) {
    const item = {
      id: detection.id || `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: detection.timestamp || new Date().toISOString(),
      type: detection.type,
      result: detection.result,
      confidence: detection.confidence,
      camera: detection.camera || 'front_1080p',
      details: detection.details || {},
      status: detection.status || 'VERIFIED',
    };

    this.detections.unshift(item);
    if (this.detections.length > 300) {
      this.detections = this.detections.slice(0, 300);
    }
    return item;
  }

  getDetections(options = {}) {
    let result = [...this.detections];

    if (options.type && options.type !== 'all') {
      result = result.filter((d) => d.type === options.type);
    }

    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.result.toLowerCase().includes(q) ||
          (d.details?.plateNumber && d.details.plateNumber.toLowerCase().includes(q)) ||
          (d.details?.vehicleType && d.details.vehicleType.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (options.sortBy === 'time_asc') {
      result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else if (options.sortBy === 'confidence_desc') {
      result.sort((a, b) => b.confidence - a.confidence);
    } else {
      // Default: newest first
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    const total = result.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const start = (page - 1) * limit;
    const paginated = result.slice(start, start + limit);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats: {
        total: this.detections.length,
        ambulance: this.detections.filter((d) => d.type === 'ambulance').length,
        anpr: this.detections.filter((d) => d.type === 'anpr').length,
        vehicle: this.detections.filter((d) => d.type === 'vehicle').length,
        face: this.detections.filter((d) => d.type === 'face').length,
      },
    };
  }

  clearDetections() {
    this.detections = [];
    return { success: true };
  }
}

export const detectionService = new DetectionService();
