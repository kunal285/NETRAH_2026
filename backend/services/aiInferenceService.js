import { EventEmitter } from 'events';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { AiEvent } from '../models/AiEvent.js';
import { NumberPlate } from '../models/NumberPlate.js';
import { AmbulanceEvent } from '../models/AmbulanceEvent.js';
import { VehicleDetection } from '../models/VehicleDetection.js';
import { PedestrianEvent } from '../models/PedestrianEvent.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class AiInferenceService extends EventEmitter {
  constructor() {
    super();
    this.aiOnline = false;
    this.lastHealthCheck = 0;
    this.lastInferenceLatencyMs = 0;
    this.activeAmbulance = null;
    this.recentPlatesCooldown = new Map(); // Plate -> timestamp
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

    // Check AI Microservice health every 5 seconds
    this.checkHealth();
    setInterval(() => this.checkHealth(), 5000);

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

  async checkHealth() {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.aiOnline = true;
        this.lastInferenceLatencyMs = Date.now() - start;
        this.emit('status', {
          online: true,
          models: data.models,
          latencyMs: this.lastInferenceLatencyMs,
        });
        return true;
      }
    } catch {
      this.aiOnline = false;
      this.emit('status', {
        online: false,
        latencyMs: -1,
      });
      return false;
    }
  }

  getStatus() {
    return {
      aiOnline: this.aiOnline,
      serviceUrl: AI_SERVICE_URL,
      latencyMs: this.lastInferenceLatencyMs,
      activeAmbulance: this.activeAmbulance,
      trafficStats: this.inMemoryTrafficStats,
    };
  }

  async processFrame(payload, io) {
    const start = Date.now();
    let result = null;

    if (this.aiOnline) {
      try {
        const res = await fetch(`${AI_SERVICE_URL}/detect/frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          result = await res.json();
          this.lastInferenceLatencyMs = Date.now() - start;
        }
      } catch (e) {
        console.warn('[AI Service] Frame forward error:', e.message);
      }
    }

    // Fallback if Python AI is unavailable or returned no result
    if (!result) {
      result = this._generateLocalInference(payload, start);
    }

    // Update internal traffic statistics
    if (result.counts) {
      this.inMemoryTrafficStats = {
        ...this.inMemoryTrafficStats,
        ...result.counts,
        lane_occupancy: result.lane_occupancy || this.inMemoryTrafficStats.lane_occupancy,
        congestion_level: result.traffic_density || 'LOW',
      };
    }

    // Handle high-value events & persistence
    await this._handleEvents(result, payload, io);

    return result;
  }

  async _handleEvents(result, payload, io) {
    const isDemo = Boolean(payload?.isDemo);
    const cameraId = payload?.camera_id || 'CAM-01';

    // 1. Ambulance Event
    if (result.emergency_ambulance && result.emergency_ambulance.is_emergency) {
      const amb = result.emergency_ambulance;
      this.activeAmbulance = {
        ...amb,
        timestamp: result.timestamp || new Date().toISOString(),
      };

      const eventObj = {
        eventId: `amb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'AMBULANCE_DETECTED',
        timestamp: new Date(),
        cameraId,
        confidence: amb.combined_confidence || 0.95,
        objectClass: 'ambulance',
        lane: amb.lane,
        metadata: {
          direction: amb.direction,
          distanceMeters: amb.distance_meters,
          sirenConfidence: amb.siren_confidence,
          visualConfidence: amb.confidence,
          status: amb.status,
        },
        isDemo,
      };

      await this._saveEvent(eventObj);
      if (io) {
        io.emit('ai:event', eventObj);
        io.emit('ai:ambulance_alert', this.activeAmbulance);
      }
    }

    // 2. ANPR Plates Event with 5-second duplicate suppression
    if (result.plates && result.plates.length > 0) {
      for (const p of result.plates) {
        const plateData = p.plate || {};
        const plateNumber = plateData.text || p.result || 'MH12AB1234';

        if (plateNumber && plateNumber !== 'UNREADABLE') {
          const lastSeen = this.recentPlatesCooldown.get(plateNumber);
          const isDuplicate = lastSeen && Date.now() - lastSeen < 5000;

          if (!isDuplicate) {
            this.recentPlatesCooldown.set(plateNumber, Date.now());

            const anprEvent = {
              eventId: `plate-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              type: 'PLATE_DETECTED',
              timestamp: new Date(),
              cameraId,
              confidence: plateData.confidence || 0.94,
              objectClass: 'license_plate',
              bbox: p.bbox || [],
              lane: p.lane || 'Lane 1',
              metadata: {
                plateNumber,
                state: plateData.state || 'Maharashtra',
                vehicleType: p.class_name || 'CAR',
                isValid: plateData.is_valid !== false,
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
      const riskEvent = {
        eventId: `risk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'CROSSWALK_RISK',
        timestamp: new Date(),
        cameraId,
        confidence: risk.score || 0.92,
        objectClass: 'pedestrian_crosswalk',
        metadata: {
          riskLevel: risk.risk_level,
          inCrosswalkCount: risk.in_crosswalk_count,
          approachingVehicles: risk.approaching_vehicles,
          message: risk.message,
        },
        isDemo,
      };

      await this._saveEvent(riskEvent);
      if (io) {
        io.emit('ai:event', riskEvent);
        io.emit('ai:crosswalk_risk', riskEvent);
      }
    }

    // 4. Traffic Density Real-time Broadcast
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
        console.warn('[AiService] DB save event error:', err.message);
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
        });
      } catch (err) {
        console.warn('[AiService] DB save ANPR error:', err.message);
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

  _generateLocalInference(payload, startTime) {
    // Graceful local engine if Python service is offline
    const hints = payload?.hint_detections || [];
    const objects = hints.map((h, i) => ({
      track_id: i + 1,
      class_name: h.class || 'car',
      confidence: h.confidence || 0.92,
      bbox: h.bbox || [0.2, 0.3, 0.3, 0.4],
      lane: 'Lane 2',
      speed_est: 35.0,
      plate: h.plate ? { text: h.plate, state: 'Maharashtra', confidence: 0.95, is_valid: true } : undefined,
    }));

    return {
      success: true,
      timestamp: new Date().toISOString(),
      objects,
      counts: {
        total_vehicles: objects.length,
        total_counted_cumulative: objects.length,
        cars: objects.filter((o) => o.class_name === 'car').length,
        motorcycles: objects.filter((o) => o.class_name === 'motorcycle').length,
        buses: objects.filter((o) => o.class_name === 'bus').length,
        trucks: objects.filter((o) => o.class_name === 'truck').length,
        pedestrians: objects.filter((o) => o.class_name === 'person').length,
        plates_detected: objects.filter((o) => o.plate).length,
        ambulance_active: false,
      },
      lane_occupancy: { 'Lane 1': 0, 'Lane 2': objects.length, 'Lane 3': 0, 'Lane 4': 0 },
      traffic_density: objects.length > 5 ? 'HIGH' : objects.length > 2 ? 'MODERATE' : 'LOW',
      emergency_ambulance: null,
      crosswalk_safety: { risk_level: 'SAFE', score: 0.1, in_crosswalk_count: 0, message: 'Crosswalk clear' },
      warden_gesture: null,
      plates: objects.filter((o) => o.plate),
      performance: {
        inference_latency_ms: Date.now() - startTime,
        model: 'PRAHARI-Local-EdgeV2 (Offline Fallback)',
        device: 'CPU',
        fps_capacity: 30.0,
      },
    };
  }
}

export const aiInferenceService = new AiInferenceService();
