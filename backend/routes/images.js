import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { StoredImage } from '../models/StoredImage.js';
import { imageStorage } from '../storage/localStorage.js';

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
    if (!['device', 'robot', 'demo'].includes(cameraSource)) return res.status(400).json({ error: 'INVALID_CAMERA_SOURCE' });
    const extension = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const imageId = crypto.randomUUID();
    const storageKey = await imageStorage.save(req.file.buffer, req.file.mimetype, extension);
    const image = await StoredImage.create({ imageId, robotId: req.body.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-MK1', cameraSource, imageType, storageKey, imageUrl: `/api/images/${imageId}`, mimeType: req.file.mimetype, fileSize: req.file.size, width: req.body.width ? Number(req.body.width) : null, height: req.body.height ? Number(req.body.height) : null, isDemo: req.body.isDemo === 'true' });
    res.status(201).json(image);
  } catch (error) { next(error); }
});

imageRouter.get('/:id', async (req, res, next) => {
  try {
    const image = await StoredImage.findOne({ imageId: req.params.id });
    if (!image || !(await imageStorage.exists(image.storageKey))) return res.status(404).json({ error: 'IMAGE_NOT_FOUND' });
    res.type(image.mimeType).send(await imageStorage.retrieve(image.storageKey));
  } catch (error) { next(error); }
});

imageRouter.delete('/:id', async (req, res, next) => {
  try {
    const image = await StoredImage.findOneAndDelete({ imageId: req.params.id });
    if (!image) return res.status(404).json({ error: 'IMAGE_NOT_FOUND' });
    await imageStorage.delete(image.storageKey);
    res.json({ success: true });
  } catch (error) { next(error); }
});
