import express from 'express';
import { authRouter } from './auth.js';
import { imageRouter } from './images.js';
import { detectionRouter } from './detections.js';
import { historyRouter } from './history.js';
import { cameraRouter } from './camera.js';
import { aiRouter } from './ai.js';
import { createDeviceRouter } from './deviceRoutes.js';

export function createApiRouter() {
  const router = express.Router();
  router.use('/auth', authRouter);
  router.use('/images', imageRouter);
  router.use('/camera', cameraRouter);
  router.use('/detections', detectionRouter);
  router.use('/ai', aiRouter);
  router.use('/device', createDeviceRouter());
  router.use('/devices', createDeviceRouter());
  router.use(historyRouter);
  return router;
}
