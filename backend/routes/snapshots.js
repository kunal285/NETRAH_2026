import express from 'express';
import { cameraSnapshotService } from '../services/cameraSnapshotService.js';
import { s3Service } from '../services/s3Service.js';

export const snapshotsRouter = express.Router();

/**
 * POST /api/snapshot or POST /api/snapshots or POST /api/snapshots/capture
 * Captures real live frame from camera, uploads to AWS S3, saves to DB, emits Socket.IO event
 */
const handleSnapshotCapture = async (req, res) => {
  try {
    const { robotId, image, source } = req.body || {};
    const io = req.app.get('io');

    const result = await cameraSnapshotService.captureSnapshot({
      robotId: robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-01',
      providedImageBase64: image || null,
      source: source || 'MAST_CAMERA',
      io,
    });

    let signedUrl = result.signedUrl || result.imageUrl;
    if (result.s3Key && result.imageUploadStatus === 'UPLOADED') {
      try {
        const s3Signed = await s3Service.getDetectionImageUrl(result.s3Key);
        if (s3Signed) signedUrl = s3Signed;
      } catch {}
    }

    res.json({
      success: true,
      snapshot_id: result.snapshotId,
      snapshotId: result.snapshotId,
      filename: result.filename,
      robotId: result.robotId,
      s3Key: result.s3Key,
      url: signedUrl || result.imageUrl,
      imageUrl: result.imageUrl,
      signedUrl: signedUrl || result.imageUrl,
      imageBase64: result.imageBase64,
      imageUploadStatus: result.imageUploadStatus,
      width: result.width,
      height: result.height,
      size: result.fileSize,
      fileSize: result.fileSize,
      timestamp: result.timestamp || result.createdAt || new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SNAPSHOT ROUTE ERROR]', err.message);
    res.status(500).json({
      success: false,
      error: 'CAMERA_UNAVAILABLE',
      message: err.message || 'Unable to capture a frame from the robot camera.',
    });
  }
};

snapshotsRouter.post('/', handleSnapshotCapture);
snapshotsRouter.post('/capture', handleSnapshotCapture);

/**
 * GET /api/snapshots
 * Lists all snapshots (newest first)
 */
snapshotsRouter.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const robotId = req.query.robotId || null;
    const list = await cameraSnapshotService.getSnapshots({ limit, robotId });

    res.json({
      success: true,
      count: list.length,
      snapshots: list,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/snapshots/:id
 * Retrieve snapshot metadata and fresh signed URL
 */
snapshotsRouter.get('/:id', async (req, res) => {
  try {
    const snap = await cameraSnapshotService.getSnapshotById(req.params.id);
    if (!snap) {
      return res.status(404).json({ success: false, error: 'SNAPSHOT_NOT_FOUND' });
    }
    res.json({ success: true, snapshot: snap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/snapshots/:id/url
 * Retrieve signed URL directly
 */
snapshotsRouter.get('/:id/url', async (req, res) => {
  try {
    const snap = await cameraSnapshotService.getSnapshotById(req.params.id);
    if (!snap) {
      return res.status(404).json({ success: false, error: 'SNAPSHOT_NOT_FOUND' });
    }

    res.json({
      success: true,
      snapshotId: snap.snapshotId,
      url: snap.signedUrl || snap.imageUrl,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/snapshots/:id/image
 * Streams or redirects to snapshot image
 */
snapshotsRouter.get('/:id/image', async (req, res) => {
  try {
    const snap = await cameraSnapshotService.getSnapshotById(req.params.id);
    if (!snap) {
      return res.status(404).send('Snapshot not found');
    }

    // Always prefer local buffer / database base64 stream to prevent raw S3 AccessDenied errors
    const frameBuf = await cameraSnapshotService.getSnapshotBuffer(req.params.id, snap.robotId);
    if (frameBuf && frameBuf.length > 0) {
      res.setHeader('Content-Type', snap.mimeType || 'image/jpeg');
      res.setHeader('Content-Length', frameBuf.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.end(frameBuf);
    }

    if (snap.signedUrl && snap.signedUrl.startsWith('http') && snap.imageUploadStatus === 'UPLOADED') {
      return res.redirect(snap.signedUrl);
    }

    res.status(404).send('Snapshot image buffer empty');
  } catch (err) {
    res.status(500).send(`Image retrieval error: ${err.message}`);
  }
});

/**
 * GET /api/camera/snapshot-status (Section 29)
 */
snapshotsRouter.get('/status', (_req, res) => {
  res.json(cameraSnapshotService.getStatus());
});
