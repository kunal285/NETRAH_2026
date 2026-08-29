import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { StoredImage } from '../models/StoredImage.js';
import { s3Storage } from '../storage/s3Storage.js';
import { authenticate } from '../middleware/auth.js';
import { db } from '../config/db.js';

export const storageRouter = express.Router();

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp']);

// Setup multer in-memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// Helper to validate magic numbers of the buffer
function validateMagicNumbers(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const hex = buffer.toString('hex', 0, 12).toUpperCase();
  
  if (hex.startsWith('FFD8FF')) {
    return 'image/jpeg';
  }
  if (hex.startsWith('89504E470D0A1A0A')) {
    return 'image/png';
  }
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') {
    return 'image/webp';
  }
  return null;
}

// Helper to generate S3 Key
export function generateS3Key(type, robotId = 'PRAHARI-01', extension = 'jpg') {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const uniqueId = crypto.randomUUID();

  const cleanType = String(type || '').trim().toLowerCase();
  
  if (cleanType === 'number plate' || cleanType === 'anpr') {
    return `anpr/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'ambulance') {
    return `ambulance/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'detection evidence' || cleanType === 'incident') {
    return `incidents/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'robot snapshot') {
    return `robot/${robotId}/snapshots/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'face') {
    return `faces/enrolled/${uniqueId}.${extension}`;
  } else {
    return `uploads/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  }
}

// POST /api/storage/upload
storageRouter.post('/upload', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'NO_FILE_UPLOADED' });
    }

    // 1. Validate file extension
    const ext = path.extname(req.file.originalname).toLowerCase().replace(/^\./, '');
    if (!allowedExtensions.has(ext)) {
      return res.status(400).json({ error: 'INVALID_FILE_EXTENSION' });
    }

    // 2. Validate MIME type
    if (!allowedMimeTypes.has(req.file.mimetype)) {
      return res.status(400).json({ error: 'INVALID_MIME_TYPE' });
    }

    // 3. Validate Magic Numbers (Content verification)
    const detectedMime = validateMagicNumbers(req.file.buffer);
    if (!detectedMime || detectedMime !== req.file.mimetype) {
      return res.status(400).json({ error: 'FILE_CONTENT_MISMATCH_OR_UNSUPPORTED' });
    }

    // 4. Generate metadata
    const imageType = req.body.imageType || 'uploads';
    const robotId = req.body.robotId || 'PRAHARI-01';
    const cameraSource = req.body.cameraSource || 'device';
    const extension = ext === 'jpeg' ? 'jpg' : ext;
    const imageId = crypto.randomUUID();
    
    // Generate the key
    const s3Key = generateS3Key(imageType, robotId, extension);
    const bucketName = process.env.IMAGE_STORAGE_BUCKET;

    // 5. Upload to S3
    await s3Storage.upload(req.file.buffer, s3Key, req.file.mimetype);

    const imageData = {
      imageId,
      robotId,
      cameraSource,
      imageType,
      storageKey: s3Key,
      imageUrl: `/api/storage/image/${imageId}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      width: req.body.width ? Number(req.body.width) : null,
      height: req.body.height ? Number(req.body.height) : null,
      isDemo: req.body.isDemo === 'true' || req.body.isDemo === true,
      
      // S3 specific metadata
      imageKey: s3Key,
      storage: 's3',
      bucket: bucketName,
      contentType: req.file.mimetype,
    };

    // Save in DB if connected
    if (db.getStatus().connected) {
      const image = await StoredImage.create(imageData);
      return res.status(201).json(image);
    }

    // Return object anyway in mock/fallback
    res.status(201).json(imageData);
  } catch (error) {
    console.error('[Storage Upload Error]:', error);
    next(error);
  }
});

// GET /api/storage/image/:id
storageRouter.get('/image/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    let image = null;
    if (db.getStatus().connected) {
      image = await StoredImage.findOne({ imageId: id });
    }

    if (!image) {
      return res.status(404).json({ error: 'IMAGE_NOT_FOUND' });
    }

    // Generate S3 presigned URL (15 minutes validity = 900 seconds)
    const presignedUrl = await s3Storage.generatePresignedUrl(image.storageKey || image.imageKey, 900);

    res.json({
      imageId: image.imageId,
      url: presignedUrl,
      expiresIn: 900,
      contentType: image.contentType || image.mimeType,
    });
  } catch (error) {
    console.error('[Storage Retrieve Error]:', error);
    next(error);
  }
});

// DELETE /api/storage/image/:id
storageRouter.delete('/image/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    let image = null;
    if (db.getStatus().connected) {
      image = await StoredImage.findOneAndDelete({ imageId: id });
    }

    if (!image) {
      return res.status(404).json({ error: 'IMAGE_NOT_FOUND' });
    }

    // Delete S3 object
    await s3Storage.delete(image.storageKey || image.imageKey);

    res.json({ success: true, message: 'Image deleted from S3 and MongoDB' });
  } catch (error) {
    console.error('[Storage Delete Error]:', error);
    next(error);
  }
});
