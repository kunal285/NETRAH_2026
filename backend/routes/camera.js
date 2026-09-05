import express from 'express';

export const cameraRouter = express.Router();

cameraRouter.get('/', (_req, res) => {
  const esp32StreamUrl = process.env.ROBOT_CAMERA_STREAM_URL || process.env.ESP32_CAM_STREAM_URL || null;
  res.json({
    primary: 'mobile',
    sources: {
      mobile: { available: true, primary: true, label: 'Mobile Camera (Primary)', permissionRequired: true },
      esp32: { available: Boolean(esp32StreamUrl), primary: false, label: 'ESP32-CAM Stream (Optional)', status: esp32StreamUrl ? 'ONLINE' : 'STANDBY', streamUrl: esp32StreamUrl },
      robot: { available: Boolean(esp32StreamUrl), primary: false, label: 'ESP32-CAM Stream (Optional)', status: esp32StreamUrl ? 'ONLINE' : 'STANDBY', streamUrl: esp32StreamUrl },
      device: { available: true, label: 'Webcam / Browser Camera', permissionRequired: true },
      demo: { available: true, label: 'Demo Simulation Stream', status: 'DEMO CAMERA' },
    },
  });
});

cameraRouter.post('/robot/status', (req, res) => {
  const io = req.app.get('io');
  const status = { robotId: req.body?.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-MK1', status: req.body?.status || 'STREAMING', timestamp: new Date().toISOString() };
  io.emit('robot:camera', status);
  res.json({ success: true, status });
});