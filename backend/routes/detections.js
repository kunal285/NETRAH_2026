import express from 'express';
import { detectionService } from '../services/detectionService.js';
import { s3Service } from '../services/s3Service.js';

export const detectionRouter = express.Router();

/**
 * GET /api/detections/stats
 * Real-time detection counters for dashboard
 */
detectionRouter.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: detectionService.getStats(),
  });
});

/**
 * GET /api/detections
 * Query perception detections with filtering, search, pagination
 */
detectionRouter.get('/', async (req, res, next) => {
  try {
    const result = await detectionService.getDetections(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/detections/:id
 * Retrieve single detection record
 */
detectionRouter.get('/:id', async (req, res, next) => {
  try {
    const detection = detectionService.getDetectionById(req.params.id);
    if (!detection) {
      return res.status(404).json({ error: 'DETECTION_NOT_FOUND', message: 'Detection not found' });
    }
    res.json({ success: true, data: detection });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/detections/:id/image
 * Serve or redirect to signed AWS S3 image URL for a detection
 */
detectionRouter.get('/:id/image', async (req, res, next) => {
  try {
    const detection = detectionService.getDetectionById(req.params.id);
    if (!detection || !detection.imageKey) {
      return res.status(404).json({
        error: 'IMAGE_NOT_FOUND',
        message: 'No image attached to this detection record',
      });
    }

    // Generate fresh signed URL (valid for 1 hour)
    const signedUrl = await s3Service.getDetectionImageUrl(detection.imageKey, 3600);
    if (signedUrl && signedUrl.startsWith('http')) {
      return res.redirect(signedUrl);
    }

    // Direct stream fallback
    try {
      const s3Stream = await s3Service.getObjectStream(detection.imageKey);
      res.setHeader('Content-Type', s3Stream.ContentType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      s3Stream.Body.pipe(res);
    } catch (streamErr) {
      res.status(404).json({ error: 'IMAGE_STREAM_FAILED', message: streamErr.message });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/detections
 * Ingest new AI detection with optional image frame and broadcast to Socket.IO
 */
detectionRouter.post('/', async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const detection = await detectionService.processAndSaveDetection(req.body, io);
    res.status(201).json({
      success: true,
      data: detection,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/detections
 * Clear all detection logs and delete associated S3 images
 */
detectionRouter.delete('/', async (req, res, next) => {
  try {
    const result = await detectionService.clearDetections();
    res.json(result);
  } catch (error) {
    next(error);
  }
});
