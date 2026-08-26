import express from 'express';
import mongoose from 'mongoose';
import { Detection } from '../models/Detection.js';
import { NumberPlate } from '../models/NumberPlate.js';
import { persistenceService } from '../services/persistenceService.js';
import { db } from '../config/db.js';

export const detectionRouter = express.Router();
const integer = (value, fallback, max) => Math.min(max, Math.max(1, Number.parseInt(value, 10) || fallback));

async function listDetections(req, res, next) {
  try {
    if (!db.getStatus().connected) return next('route');
    const page = integer(req.query.page, 1, 100000);
    const limit = integer(req.query.limit, 10, 100);
    const filter = {};
    if (req.query.type && req.query.type !== 'all') filter.type = req.query.type === 'anpr' ? 'number_plate' : req.query.type;
    if (req.query.robotId) filter.robotId = req.query.robotId;
    if (req.query.from || req.query.to) filter.timestamp = {};
    if (req.query.from) filter.timestamp.$gte = new Date(req.query.from);
    if (req.query.to) filter.timestamp.$lte = new Date(req.query.to);
    if (req.query.search) filter.$or = [{ result: { $regex: req.query.search, $options: 'i' } }, { 'details.plateNumber': { $regex: req.query.search, $options: 'i' } }, { 'details.vehicleType': { $regex: req.query.search, $options: 'i' } }];
    const sort = req.query.sortBy === 'time_asc' ? { timestamp: 1 } : req.query.sortBy === 'confidence_desc' ? { confidence: -1 } : { timestamp: -1 };
    const [data, total] = await Promise.all([Detection.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(), Detection.countDocuments(filter)]);
    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 });
  } catch (error) { next(error); }
}

detectionRouter.get('/', listDetections);
detectionRouter.get('/number-plates/history', async (req, res, next) => {
  try {
    const page = integer(req.query.page, 1, 100000); const limit = integer(req.query.limit, 10, 100);
    const filter = {};
    if (req.query.robotId) filter.robotId = req.query.robotId;
    if (req.query.plate) filter.plateNumber = { $regex: req.query.plate, $options: 'i' };
    if (req.query.from || req.query.to) filter.timestamp = { ...(req.query.from && { $gte: new Date(req.query.from) }), ...(req.query.to && { $lte: new Date(req.query.to) }) };
    const [data, total] = await Promise.all([NumberPlate.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(), NumberPlate.countDocuments(filter)]);
    res.json({ data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 });
  } catch (error) { next(error); }
});
detectionRouter.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'INVALID_MONGODB_ID' });
    const detection = await Detection.findById(req.params.id).lean();
    if (!detection) return res.status(404).json({ error: 'DETECTION_NOT_FOUND' });
    res.json(detection);
  } catch (error) { next(error); }
});
detectionRouter.post('/', async (req, res, next) => {
  try {
    const detection = await persistenceService.saveDetection(req.body, req.body.robotId, Boolean(req.body.isDemo));
    if (!detection) return res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
    req.app.get('io').emit('robot:detection', detection);
    req.app.get('io').emit('ai:detection', detection);
    res.status(201).json(detection);
  } catch (error) { next(error); }
});
