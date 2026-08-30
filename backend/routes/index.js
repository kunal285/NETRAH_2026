import express from 'express';
import { authRouter } from './auth.js';
import { imageRouter } from './images.js';
import { storageRouter } from './storage.js';
import { detectionRouter } from './detections.js';
import { historyRouter } from './history.js';
import { cameraRouter } from './camera.js';
import { aiRouter } from './ai.js';
import { robotRouter } from './robotRoutes.js';
import { createDeviceRouter } from './deviceRoutes.js';
import { s3Service } from '../services/s3Service.js';
import { db } from '../config/db.js';
import { deviceService } from '../services/deviceService.js';

export function createApiRouter() {
  const router = express.Router();

  // Core API Modules
  router.use('/auth', authRouter);
  router.use('/images', imageRouter);
  router.use('/storage', storageRouter);
  router.use('/camera', cameraRouter);
  router.use('/detections', detectionRouter);
  router.use('/ai', aiRouter);
  router.use('/robot', robotRouter);
  router.use('/device', createDeviceRouter());
  router.use('/devices', createDeviceRouter());
  router.use(historyRouter);

  // ----------------------------------------------------
  // EMERGENCY CORRIDOR ROUTE
  // ----------------------------------------------------
  router.post('/emergency/green-corridor', (req, res) => {
    const io = req.app.get('io');
    const { signalId, corridorLane, durationSec, reason } = req.body || {};

    const payload = {
      corridorId: `CORRIDOR-${Date.now()}`,
      status: 'ACTIVE',
      signalId: signalId || 'INTERSECTION_04',
      corridorLane: corridorLane || 'LANE_1_NORTHBOUND',
      durationSec: durationSec || 60,
      reason: reason || 'Emergency vehicle priority dispatch',
      timestamp: new Date().toISOString(),
    };

    if (io) {
      io.emit('emergency:corridor', payload);
      io.emit('ai:ambulance_alert', {
        id: payload.corridorId,
        type: 'AMBULANCE',
        detectionInfo: 'Emergency Green Corridor Engaged',
        confidence: 0.99,
        source: 'MANUAL_DISPATCH',
        timestamp: payload.timestamp,
      });
    }

    res.json({
      success: true,
      message: 'Green corridor engaged successfully',
      corridor: payload,
    });
  });

  // ----------------------------------------------------
  // HEALTH CHECKS
  // ----------------------------------------------------
  router.get('/health', async (req, res) => {
    const dbStatus = db.getStatus();
    const s3Status = await s3Service.testConnection();
    const robotState = deviceService.getDeviceState('PRAHARI-01');

    res.json({
      success: true,
      service: 'PRAHARI Command Center Backend',
      status: 'healthy',
      backend: 'ok',
      database: dbStatus.connected ? 'ok' : 'fallback',
      socket: 'ok',
      s3: s3Status.connected ? 'ok' : 'degraded',
      ai: 'ok',
      robot: robotState.status.toLowerCase(),
      camera: process.env.ROBOT_CAMERA_STREAM_URL ? 'streaming' : 'offline',
      services: {
        database: dbStatus.connected ? 'connected' : 'in-memory-fallback',
        s3: s3Status.status,
        websocket: 'ready',
      },
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/health/s3', async (req, res) => {
    const s3Status = await s3Service.testConnection();
    res.status(s3Status.connected ? 200 : 503).json(s3Status);
  });

  // ----------------------------------------------------
  // S3 DEV TEST ENDPOINT (For diagnostics)
  // ----------------------------------------------------
  router.post('/dev/test-s3', async (req, res) => {
    try {
      // 1x1 transparent JPEG pixel buffer
      const testBuffer = Buffer.from(
        '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        'base64'
      );
      const testId = `test_${Date.now()}`;
      const uploadResult = await s3Service.uploadDetectionImage({
        imageBuffer: testBuffer,
        detectionId: testId,
        robotId: 'PRAHARI-TEST',
        mimeType: 'image/jpeg',
      });

      res.json({
        success: uploadResult.uploadStatus === 'UPLOADED',
        result: uploadResult,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
