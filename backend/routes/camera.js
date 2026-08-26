import express from 'express';

export const cameraRouter = express.Router();

cameraRouter.get('/', (_req, res) => {
  const robotStreamUrl = process.env.ROBOT_CAMERA_STREAM_URL || null;
  res.json({
    sources: {
      device: { available: true, permissionRequired: true },
      robot: { available: Boolean(robotStreamUrl), status: robotStreamUrl ? 'ROBOT CAMERA ONLINE' : 'ROBOT CAMERA OFFLINE', streamUrl: robotStreamUrl },
      demo: { available: true, status: 'DEMO CAMERA' },
    },
  });
});

cameraRouter.post('/robot/status', (req, res) => {
  const io = req.app.get('io');
  const status = { robotId: req.body?.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-MK1', status: req.body?.status || 'STREAMING', timestamp: new Date().toISOString() };
  io.emit('robot:camera', status);
  res.json({ success: true, status });
});