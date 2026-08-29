import express from 'express';
import { inferenceService as aiInferenceService } from '../services/ai/inferenceService.js';
import { aiService } from '../services/aiService.js';
import { db } from '../config/db.js';
import { AiEvent } from '../models/AiEvent.js';
import { NumberPlate } from '../models/NumberPlate.js';

export const aiRouter = express.Router();

// Real-time camera stream frame processing
aiRouter.post('/process-frame', async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const result = await aiInferenceService.processFrame(req.body, io);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// AI Engine Health & Latency status
aiRouter.get('/status', (req, res) => {
  res.json(aiInferenceService.getStatus());
});

// Live Event Feed
aiRouter.get('/events', async (req, res, next) => {
  try {
    const { type, search, limit, page } = req.query;
    if (db.getStatus().connected) {
      const filter = {};
      if (type && type !== 'all') filter.type = { $regex: type, $options: 'i' };
      if (search) {
        filter.$or = [
          { type: { $regex: search, $options: 'i' } },
          { 'metadata.plateNumber': { $regex: search, $options: 'i' } },
          { 'metadata.message': { $regex: search, $options: 'i' } },
        ];
      }
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const [events, total] = await Promise.all([
        AiEvent.find(filter).sort({ timestamp: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
        AiEvent.countDocuments(filter),
      ]);
      return res.json({ events, total, page: pageNum, limit: limitNum });
    }

    const events = aiInferenceService.getEvents({ type, search, limit: parseInt(limit, 10) || 50 });
    res.json({ events, total: events.length, page: 1, limit: events.length });
  } catch (error) {
    next(error);
  }
});

// Clear Events
aiRouter.delete('/events', (req, res) => {
  aiInferenceService.clearEvents();
  res.json({ success: true });
});

// ANPR Table
aiRouter.get('/anpr', async (req, res, next) => {
  try {
    const { search, state } = req.query;
    if (db.getStatus().connected) {
      const filter = {};
      if (search) {
        filter.$or = [
          { plateNumber: { $regex: search, $options: 'i' } },
          { vehicleType: { $regex: search, $options: 'i' } },
        ];
      }
      const plates = await NumberPlate.find(filter).sort({ timestamp: -1 }).limit(100).lean();
      return res.json({ plates });
    }

    const plates = aiInferenceService.getAnprList({ search, state });
    res.json({ plates });
  } catch (error) {
    next(error);
  }
});

// Active Ambulance
aiRouter.get('/ambulance', (req, res) => {
  const active = aiInferenceService.getStatus().activeAmbulance || aiService.getActiveAmbulance();
  res.json({ activeAmbulance: active });
});

// Acknowledge Ambulance Corridor
aiRouter.post('/acknowledge-ambulance', (req, res) => {
  const io = req.app.get('io');
  aiInferenceService.acknowledgeAmbulance();
  aiService.acknowledgeAmbulance();
  if (io) {
    io.emit('ai:ambulance_cleared');
  }
  res.json({ success: true, message: 'Green Corridor Cleared' });
});

// Trigger Synthetic Demo Detection
aiRouter.post('/trigger', async (req, res) => {
  const { type } = req.body;
  const detection = await aiService.triggerSyntheticDetection(type || 'ambulance');
  const io = req.app.get('io');
  if (io) {
    io.emit('ai:detection', detection);
    io.emit('ai:event', {
      eventId: detection.id,
      type: `${(type || 'ambulance').toUpperCase()}_DETECTED`,
      timestamp: new Date(),
      cameraId: 'CAM-DEMO',
      confidence: detection.confidence,
      objectClass: type,
      metadata: detection.details,
      isDemo: true,
    });
    if (type === 'ambulance') {
      io.emit('ai:ambulance_alert', detection);
    }
  }
  res.json({ success: true, detection });
});

// Historical Analytics Aggregation — 100% Real Live & Persisted Data
aiRouter.get('/analytics', async (req, res, next) => {
  try {
    const stats = aiInferenceService.getStatus().trafficStats || {};
    let totalVehicles = stats.total_counted_cumulative || 0;
    let activeVehicles = stats.total_vehicles || 0;
    let cars = stats.cars || 0;
    let motorcycles = stats.motorcycles || 0;
    let buses = stats.buses || 0;
    let trucks = stats.trucks || 0;
    const laneOccupancy = stats.lane_occupancy || { 'Lane 1': 0, 'Lane 2': 0, 'Lane 3': 0, 'Lane 4': 0 };
    const congestion = stats.congestion_level || 'LOW';

    if (db.getStatus().connected) {
      const [vehicleCount] = await Promise.all([
        AiEvent.countDocuments({ type: { $in: ['VEHICLE_DETECTED', 'AMBULANCE_DETECTED'] } }),
      ]);
      if (vehicleCount > totalVehicles) {
        totalVehicles = vehicleCount;
      }
    }

    const analytics = {
      summary: {
        totalVehiclesCounted: totalVehicles,
        activeVehicles: activeVehicles,
        congestionLevel: congestion,
        activeAmbulances: aiInferenceService.getStatus().activeAmbulance ? 1 : 0,
      },
      classDistribution: [
        { class: 'Cars', count: cars, fill: '#38bdf8' },
        { class: '2-Wheelers', count: motorcycles, fill: '#34d399' },
        { class: 'Buses', count: buses, fill: '#fbbf24' },
        { class: 'Trucks', count: trucks, fill: '#f87171' },
      ],
      laneOccupancy: Object.entries(laneOccupancy).map(([lane, count]) => ({
        lane,
        count: count || 0,
      })),
      hourlyFlow: [],
    };

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// CSV Export Generator
aiRouter.get('/export/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    let csvHeader = '';
    let csvRows = [];

    if (type === 'anpr') {
      csvHeader = 'Timestamp,Plate_Number,State,Vehicle_Type,Confidence,Camera_ID,Lane\n';
      const plates = aiInferenceService.getAnprList({});
      csvRows = plates.map(
        (p) =>
          `"${new Date(p.timestamp).toISOString()}","${p.plateNumber}","${p.state}","${p.vehicleType}","${(p.confidence * 100).toFixed(1)}%","${p.cameraId || 'CAM-01'}","${p.lane || 'Lane 1'}"`
      );
    } else if (type === 'emergency') {
      csvHeader = 'Timestamp,Event_Type,Direction,Lane,Combined_Confidence,Siren_Match,Status\n';
      const events = aiInferenceService.getEvents({ type: 'ambulance' });
      csvRows = events.map(
        (e) =>
          `"${new Date(e.timestamp).toISOString()}","${e.type}","${e.metadata?.direction || 'APPROACHING'}","${e.lane || 'Lane 2'}","${(e.confidence * 100).toFixed(1)}%","${((e.metadata?.sirenConfidence || 0) * 100).toFixed(1)}%","${e.metadata?.status || 'CORRIDOR_ACTIVE'}"`
      );
    } else {
      csvHeader = 'Timestamp,Event_Type,Confidence,Object_Class,Lane,Camera_ID\n';
      const events = aiInferenceService.getEvents({});
      csvRows = events.map(
        (e) =>
          `"${new Date(e.timestamp).toISOString()}","${e.type}","${(e.confidence * 100).toFixed(1)}%","${e.objectClass}","${e.lane || 'N/A'}","${e.cameraId}"`
      );
    }

    const csvContent = csvHeader + csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=prahari-${type}-export-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});
