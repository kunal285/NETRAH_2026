import express from 'express';
import crypto from 'crypto';
import { s3Service } from '../services/s3Service.js';
import { db } from '../config/db.js';
import { FaceEvent } from '../models/FaceEvent.js';

export const facesRouter = express.Router();

// In-memory enrolled face registry
const enrolledFaces = new Map();

// Seed default known traffic officer
enrolledFaces.set('OFFICER_01', {
  personId: 'OFFICER_01',
  name: 'Inspector R. Patil (Traffic Warden)',
  role: 'Traffic Police Inspector',
  badge: 'TP-MH12-8821',
  embedding: new Array(128).fill(0.15),
  imageUrl: null,
  imageKey: null,
  createdAt: new Date().toISOString(),
});

/**
 * GET /api/faces
 * List all enrolled faces
 */
facesRouter.get('/', (req, res) => {
  const list = Array.from(enrolledFaces.values()).map((f) => ({
    personId: f.personId,
    name: f.name,
    role: f.role,
    badge: f.badge,
    imageUrl: f.imageUrl,
    createdAt: f.createdAt,
  }));
  res.json({ success: true, faces: list, total: list.length });
});

/**
 * POST /api/faces/enroll
 * Enroll new face with embedding and reference photo in S3
 */
facesRouter.post('/enroll', async (req, res, next) => {
  try {
    const { personId, name, role, badge, image, embedding } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'MISSING_NAME', message: 'Person name is required for enrollment' });
    }

    const pid = (personId || `PER_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`).trim().toUpperCase();
    let imageUrl = null;
    let imageKey = null;

    if (image) {
      const cleanBase64 = String(image).replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length > 0) {
        const s3Res = await s3Service.uploadDetectionImage({
          imageBuffer: buffer,
          detectionId: `enroll_${pid}`,
          robotId: 'PRAHARI-ENROLL',
          subType: 'face',
          mimeType: 'image/jpeg',
        });
        if (s3Res.uploadStatus === 'UPLOADED') {
          imageKey = s3Res.key;
          imageUrl = s3Res.url;
        }
      }
    }

    const faceRecord = {
      personId: pid,
      name: String(name).trim(),
      role: role || 'Traffic Warden',
      badge: badge || `TP-${pid}`,
      embedding: Array.isArray(embedding) && embedding.length === 128 ? embedding : new Array(128).fill(0.2),
      imageKey,
      imageUrl,
      createdAt: new Date().toISOString(),
    };

    enrolledFaces.set(pid, faceRecord);

    const io = req.app.get('io');
    if (io) {
      io.emit('face:enrolled', { personId: pid, name: faceRecord.name, role: faceRecord.role });
    }

    console.log(`[FACE AI] Enrolled face: ${faceRecord.name} (${pid})`);
    res.status(201).json({
      success: true,
      message: `Enrolled face successfully for ${faceRecord.name}`,
      face: {
        personId: pid,
        name: faceRecord.name,
        role: faceRecord.role,
        badge: faceRecord.badge,
        imageUrl: faceRecord.imageUrl,
        createdAt: faceRecord.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/faces/:id
 * Remove enrolled face record and associated S3 photo
 */
facesRouter.delete('/:id', async (req, res, next) => {
  try {
    const pid = req.params.id.trim().toUpperCase();
    if (!enrolledFaces.has(pid)) {
      return res.status(404).json({ error: 'PERSON_NOT_FOUND', message: 'Person ID not found in enrolled database' });
    }

    const face = enrolledFaces.get(pid);
    if (face.imageKey) {
      await s3Service.deleteDetectionImage(face.imageKey);
    }

    enrolledFaces.delete(pid);
    console.log(`[FACE AI] Removed enrolled face: ${pid}`);

    res.json({ success: true, message: `Removed enrolled face ${pid}` });
  } catch (error) {
    next(error);
  }
});
