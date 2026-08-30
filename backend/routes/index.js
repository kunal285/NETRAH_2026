import express from 'express';
import { authRouter } from './auth.js';
import { imageRouter } from './images.js';
import { storageRouter } from './storage.js';
import { detectionRouter } from './detections.js';
import { historyRouter } from './history.js';
import { cameraRouter } from './camera.js';
import { aiRouter } from './ai.js';
import { robotRouter } from './robotRoutes.js';
import { facesRouter } from './faces.js';
import { snapshotsRouter } from './snapshots.js';
import { createDeviceRouter } from './deviceRoutes.js';
import { s3Service } from '../services/s3Service.js';
import { db } from '../config/db.js';
import { deviceService } from '../services/deviceService.js';
import { detectionService } from '../services/detectionService.js';
import { cameraSnapshotService } from '../services/cameraSnapshotService.js';

export function createApiRouter() {
  const router = express.Router();

  // Core API Modules
  router.use('/auth', authRouter);
  router.use('/images', imageRouter);
  router.use('/storage', storageRouter);
  router.use('/camera', cameraRouter);
  router.use('/snapshots', snapshotsRouter);
  router.use('/detections', detectionRouter);
  router.use('/ai', aiRouter);
  router.use('/robot', robotRouter);
  router.use('/faces', facesRouter);
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
  // HEALTH & DIAGNOSTICS ENDPOINTS (Phase 38)
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
  // CAMERA SNAPSHOT ENDPOINTS (Section 6, 28, 29)
  // ----------------------------------------------------
  router.post('/robot/camera/snapshot', async (req, res) => {
    try {
      const { robotId, image, source } = req.body || {};
      const io = req.app.get('io');
      const result = await cameraSnapshotService.captureSnapshot({
        robotId: robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-01',
        providedImageBase64: image || null,
        source: source || 'MAST_CAMERA',
        io,
      });

      let signedUrl = result.imageUrl;
      if (result.s3Key && result.imageUploadStatus === 'UPLOADED') {
        try {
          signedUrl = await s3Service.getDetectionImageUrl(result.s3Key);
        } catch {}
      }

      res.json({
        success: true,
        snapshotId: result.snapshotId,
        robotId: result.robotId,
        s3Key: result.s3Key,
        imageUrl: result.imageUrl,
        signedUrl: signedUrl || result.imageUrl,
        imageUploadStatus: result.imageUploadStatus,
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        timestamp: result.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      console.error('[SNAPSHOT ROUTE ERROR]', err.message);
      res.status(500).json({ success: false, error: err.message || 'SNAPSHOT_CAPTURE_FAILED' });
    }
  });

  router.get('/robot/camera/snapshot', async (req, res) => {
    try {
      const robotId = req.query.robotId || 'PRAHARI-01';
      const frameBuf = await cameraSnapshotService.getLatestFrameBuffer(robotId);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', frameBuf.length);
      res.setHeader('Cache-Control', 'no-cache, private');
      res.end(frameBuf);
    } catch (err) {
      res.status(500).send(`Camera frame capture error: ${err.message}`);
    }
  });

  router.get('/camera/snapshot-status', (_req, res) => {
    res.json(cameraSnapshotService.getStatus());
  });

  router.post('/dev/test-camera-snapshot', async (req, res) => {
    try {
      const io = req.app.get('io');
      const result = await cameraSnapshotService.captureSnapshot({
        robotId: 'PRAHARI-DEV-TEST',
        io,
      });

      res.json({
        success: true,
        snapshotId: result.snapshotId,
        width: result.width,
        height: result.height,
        fileSize: result.fileSize,
        s3Key: result.s3Key,
        imageUploadStatus: result.imageUploadStatus,
        timestamp: result.createdAt,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // S3 DEV TEST ENDPOINT (Phase 46)
  // ----------------------------------------------------
  router.post('/dev/test-s3', async (req, res) => {
    try {
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
