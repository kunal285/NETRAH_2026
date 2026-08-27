import express from 'express';
import { deviceService } from '../services/deviceService.js';
import { persistenceService } from '../services/persistenceService.js';

export function createDeviceRouter() {
  const router = express.Router();

  // Authentication Middleware for physical devices
  const authMiddleware = (req, res, next) => {
    if (!deviceService.authenticateDevice(req)) {
      return res.status(401).json({
        error: 'UNAUTHORIZED_DEVICE',
        message: 'Invalid or missing device credentials. Pass valid x-device-token header or deviceSecret in body.',
      });
    }
    next();
  };

  // ----------------------------------------------------
  // PHYSICAL DEVICE INGESTION ENDPOINTS (ESP32 / MCU)
  // ----------------------------------------------------

  /**
   * POST /api/device/heartbeat
   * High-frequency periodic heartbeat from ESP32
   */
  router.post('/heartbeat', authMiddleware, (req, res) => {
    try {
      const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = deviceService.processHeartbeat(req.body, senderIp);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/device/telemetry
   * Comprehensive live telemetry from ESP32 (Battery, Motors, Ultrasonic, Temp, RSSI, Safety)
   */
  router.post('/telemetry', authMiddleware, (req, res) => {
    try {
      const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = deviceService.processTelemetry(req.body, senderIp);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/device/sensors
   * Dedicated sensor array upload (ultrasonic front/rear, temperature, voltage dividers)
   */
  router.post('/sensors', authMiddleware, (req, res) => {
    try {
      const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = deviceService.processSensors(req.body, senderIp);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/device/gps
   * GPS Hardware Module upload (Lat, Lng, Speed, Accuracy, Satellites)
   */
  router.post('/gps', authMiddleware, (req, res) => {
    try {
      const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = deviceService.processGps(req.body, senderIp);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/device/imu
   * IMU (Inertial Measurement Unit) 6-DOF / 9-DOF accelerometer & gyro vector
   */
  router.post('/imu', authMiddleware, (req, res) => {
    try {
      const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = deviceService.processImu(req.body, senderIp);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/device/ack
   * Command Acknowledgement from physical ESP32
   */
  router.post('/ack', authMiddleware, (req, res) => {
    try {
      const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const result = deviceService.processAck(req.body, senderIp);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/device/safety
   * Explicit Hardware Safety / E-Stop trip report
   */
  router.post('/safety', authMiddleware, (req, res) => {
    try {
      const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const robotId = (req.body.robotId || 'PRAHARI-01').trim().toUpperCase();
      const emergencyStop = Boolean(req.body.emergencyStop);

      const dev = deviceService.getDeviceState(robotId);
      dev.safety.emergencyStop = emergencyStop;
      dev.safety.state = emergencyStop ? 'EMERGENCY_STOP' : 'SAFE';
      dev.safety.message = req.body.reason || 'Hardware safety update';
      dev.safety.updatedAt = new Date().toISOString();

      deviceService.emit('device:safety', { robotId, safety: dev.safety, timestamp: dev.safety.updatedAt });
      res.json({ success: true, robotId, safety: dev.safety });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // MULTI-ROBOT QUERY & DEBUG ENDPOINTS
  // ----------------------------------------------------

  /**
   * GET /api/devices
   * List all registered PRAHARI robots with live connectivity status
   */
  router.get('/all', (req, res) => {
    res.json({
      success: true,
      count: deviceService.devices.size,
      devices: deviceService.getAllDevices(),
    });
  });

  /**
   * GET /api/devices/:robotId
   * Full detailed state of a specific robot
   */
  router.get('/:robotId', (req, res) => {
    const robotId = req.params.robotId;
    const state = deviceService.getDeviceState(robotId);
    res.json({ success: true, robot: state });
  });

  /**
   * GET /api/devices/:robotId/status
   * Lightweight status & heartbeat check
   */
  router.get('/:robotId/status', (req, res) => {
    const robotId = req.params.robotId;
    const state = deviceService.getDeviceState(robotId);
    res.json({
      robotId: state.robotId,
      status: state.status,
      controlMode: state.controlMode,
      lastHeartbeatAt: state.lastHeartbeatAt,
      lastTelemetryAt: state.lastTelemetryAt,
      wifiRSSI: state.wifiRSSI,
      uptimeSeconds: state.uptimeSeconds,
    });
  });

  /**
   * GET /api/devices/:robotId/telemetry/history
   * Historical telemetry from memory / MongoDB
   */
  router.get('/:robotId/telemetry/history', async (req, res) => {
    try {
      const robotId = req.params.robotId;
      const limit = parseInt(req.query.limit || '50', 10);
      const dev = deviceService.getDeviceState(robotId);

      // Try database history first, fallback to in-memory history buffer
      let history = await persistenceService.getTelemetryHistory({ limit, robotId });
      if (!history || history.length === 0) {
        history = dev.telemetryHistory.slice(-limit);
      }

      res.json({ success: true, robotId, history });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/device/debug
   * Developer / Admin Live Data Monitor diagnostic stats
   */
  router.get('/debug/stats', (req, res) => {
    res.json({
      success: true,
      stats: deviceService.getDebugStats(),
    });
  });

  return router;
}
