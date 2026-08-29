import express from 'express';
import { Telemetry } from '../models/Telemetry.js';
import { SensorData } from '../models/SensorData.js';
import { Alert } from '../models/Alert.js';
import { SafetyEvent } from '../models/SafetyEvent.js';
import { ControlSession } from '../models/ControlSession.js';
import { SystemLog } from '../models/SystemLog.js';
import { db } from '../config/db.js';

export const historyRouter = express.Router();
const models = { telemetry: Telemetry, sensors: SensorData, alerts: Alert, safety: SafetyEvent, 'control-sessions': ControlSession, 'system-logs': SystemLog };
const list = (Model) => async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    if (!db.getStatus().connected) {
      return res.status(503).json({
        success: false,
        error: 'DATABASE_UNAVAILABLE',
        message: 'MongoDB database is currently unreachable. Connect to MongoDB to query history logs.',
      });
    }
    const filter = req.query.robotId ? { robotId: req.query.robotId } : {};
    const [data, total] = await Promise.all([
      Model.find(filter).sort({ timestamp: -1, startTime: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Model.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page, limit, totalPages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    next(error);
  }
};
for (const [name, Model] of Object.entries(models)) historyRouter.get(`/${name}`, list(Model));

