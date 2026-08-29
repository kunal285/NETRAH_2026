import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { StoredImage } from '../models/StoredImage.js';
import { s3Storage } from '../storage/s3Storage.js';
import { generateS3Key } from '../utils/storageUtils.js';
import { db } from '../config/db.js';

const inMemoryImages = new Map();
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, callback) => callback(null, allowedTypes.has(file.mimetype)) });
export const imageRouter = express.Router();

imageRouter.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file || !allowedTypes.has(req.file.mimetype)) return res.status(400).json({ error: 'INVALID_IMAGE_TYPE' });
    const imageType = req.body.imageType || 'detection evidence';
    const allowedImageTypes = ['vehicle', 'ambulance', 'number plate', 'face', 'detection evidence', 'robot snapshot'];
    if (!allowedImageTypes.includes(imageType)) return res.status(400).json({ error: 'INVALID_IMAGE_CATEGORY' });
    const cameraSource = req.body.cameraSource || 'device';
    if (!['device', 'robot', 'demo', 'live_stream'].includes(cameraSource)) return res.status(400).json({ error: 'INVALID_CAMERA_SOURCE' });
    const extension = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const imageId = crypto.randomUUID();
    
    const robotId = req.body.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-MK1';
    const s3Key = generateS3Key(imageType, robotId, extension);
    
    // Save to S3
    await s3Storage.upload(req.file.buffer, s3Key, req.file.mimetype);

    const imageData = {
      imageId,
      robotId,
      cameraSource,
      imageType,
      storageKey: s3Key,
      imageUrl: `/api/images/${imageId}`,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      width: req.body.width ? Number(req.body.width) : null,
      height: req.body.height ? Number(req.body.height) : null,
      isDemo: req.body.isDemo === 'true',
      imageKey: s3Key,
      storage: 's3',
      bucket: process.env.IMAGE_STORAGE_BUCKET,
      contentType: req.file.mimetype,
    };

    if (db.getStatus().connected) {
      const image = await StoredImage.create(imageData);
      return res.status(201).json(image);
    }

    inMemoryImages.set(imageId, imageData);
    res.status(201).json(imageData);
  } catch (error) { next(error); }
});

imageRouter.get('/:id', async (req, res, next) => {
  try {
    let image = null;
    if (db.getStatus().connected) {
      image = await StoredImage.findOne({ imageId: req.params.id });
    } else {
      image = inMemoryImages.get(req.params.id);
    }
    if (!image || !(await s3Storage.exists(image.storageKey))) return res.status(404).json({ error: 'IMAGE_NOT_FOUND' });
    
    const buffer = await s3Storage.retrieve(image.storageKey);
    res.type(image.mimeType).send(buffer);
  } catch (error) { next(error); }
});

imageRouter.delete('/:id', async (req, res, next) => {
  try {
    let storageKey = null;
    if (db.getStatus().connected) {
      const image = await StoredImage.findOneAndDelete({ imageId: req.params.id });
      if (!image) return res.status(404).json({ error: 'IMAGE_NOT_FOUND' });
      storageKey = image.storageKey;
    } else {
      const image = inMemoryImages.get(req.params.id);
      if (!image) return res.status(404).json({ error: 'IMAGE_NOT_FOUND' });
      storageKey = image.storageKey;
      inMemoryImages.delete(req.params.id);
    }
    if (storageKey) {
      await s3Storage.delete(storageKey);
    }
    res.json({ success: true });
  } catch (error) { next(error); }
});

