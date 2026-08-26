import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { db } from './config/db.js';
import { createApiRouter } from './routes/index.js';
import { persistenceService } from './services/persistenceService.js';

import { robotService } from './services/robotService.js';
import { safetyService } from './services/safetyService.js';
import { detectionService } from './services/detectionService.js';
import { aiService } from './services/aiService.js';
import { settingsService } from './services/settingsService.js';
import { mockRobot } from './simulator/mockRobot.js';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.BACKEND_PORT || 4000);

async function startServer() {
  try {
    await db.connect();

    const app = express();
    const server = http.createServer(app);

    // Setup Socket.IO
    const io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    app.use(express.json());
    app.set('io', io);
    app.use('/api', createApiRouter());

    // ----------------------------------------------------
    // REST API ENDPOINTS
    // ----------------------------------------------------

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({
        status: db.getStatus().connected ? 'ok' : 'degraded',
        service: 'PRAHARI Traffic-Police Robot Command Server',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: db.getStatus(),
      });
    });

    // Robot State
    app.get('/api/robot/state', (req, res) => {
      res.json(robotService.getState());
    });

    // Control Robot Mode (WEB / RC / AUTO)
    app.post('/api/robot/mode', (req, res) => {
      const { mode } = req.body;
      if (!mode || !['WEB', 'RC', 'AUTO', 'DEMO'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Must be WEB, RC, AUTO, or DEMO.' });
      }
      const state = robotService.setMode(mode);
      io.emit('robot:state', state);
      res.json({ success: true, state });
    });

    // Control Movement (FORWARD, REVERSE, LEFT, RIGHT, STOP)
    app.post('/api/robot/control', (req, res) => {
      const { command, speed } = req.body;
      const validCommands = ['FORWARD', 'REVERSE', 'LEFT', 'RIGHT', 'STOP'];
      const state = robotService.getState();
      if (!command || !validCommands.includes(command)) {
        return res.status(400).json({ error: 'command is required (FORWARD, REVERSE, LEFT, RIGHT, STOP)' });
      }
      if (state.status === 'OFFLINE') return res.status(409).json({ error: 'ROBOT_OFFLINE' });
      if (state.mode === 'RC') return res.status(409).json({ error: 'RC_OVERRIDE_ACTIVE' });
      if (state.safety?.emergencyStop) return res.status(409).json({ error: 'EMERGENCY_STOP_ACTIVE' });
      if (speed !== undefined && (!Number.isFinite(Number(speed)) || Number(speed) < 0 || Number(speed) > settingsService.getSettings().maxSpeed)) return res.status(400).json({ error: 'INVALID_SPEED' });
      const result = robotService.sendControl(command, speed);
      io.emit('robot:state', robotService.getState());
      persistenceService.startControlSession({ mode: 'WEB', isDemo: state.mode === 'DEMO' }).catch((error) => persistenceService.logSystem(error.message, 'error'));
      res.json(result);
    });

    // Emergency Stop Interlock
    app.post('/api/robot/emergency-stop', (req, res) => {
      const { reason } = req.body || {};
      const result = robotService.emergencyStop(reason || 'Operator Emergency Stop via API');
      io.emit('robot:state', robotService.getState());
      res.json(result);
    });

    // Reset Safety Interlock
    app.post('/api/robot/reset-safety', (req, res) => {
      const result = robotService.resetSafety();
      io.emit('robot:state', robotService.getState());
      res.json(result);
    });

    // Safety Events Log
    app.get('/api/safety/events', (req, res) => {
      res.json(safetyService.getEvents());
    });

    app.delete('/api/safety/events', (req, res) => {
      res.json(safetyService.clearEvents());
    });

    // Simulator Scenario Trigger
    app.post('/api/simulator/scenario', (req, res) => {
      const { scenario } = req.body;
      const result = safetyService.triggerScenario(scenario);
      res.json(result);
    });

    // AI Detections Log
    app.get('/api/detections', (req, res) => {
      const { type, search, page, limit, sortBy } = req.query;
      const result = detectionService.getDetections({
        type: type || 'all',
        search: search || '',
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        sortBy: sortBy || 'time_desc',
      });
      res.json(result);
    });

    app.delete('/api/detections', (req, res) => {
      res.json(detectionService.clearDetections());
    });

    // Trigger Synthetic AI Detection (Ambulance, ANPR, Vehicle, Face)
    app.post('/api/ai/trigger', (req, res) => {
      const { type } = req.body;
      const detection = aiService.triggerSyntheticDetection(type || 'ambulance');
      io.emit('ai:detection', detection);
      if (type === 'ambulance') {
        io.emit('ai:ambulance_alert', detection);
      }
      res.json({ success: true, detection });
    });

    // Acknowledge Ambulance Alert
    app.post('/api/ai/acknowledge-ambulance', (req, res) => {
      const result = aiService.acknowledgeAmbulance();
      io.emit('ai:ambulance_cleared');
      res.json(result);
    });

    // Active Ambulance
    app.get('/api/ai/ambulance', (req, res) => {
      res.json({ activeAmbulance: aiService.getActiveAmbulance() });
    });

    // Configuration / Settings
    app.get('/api/settings', (req, res) => {
      res.json(settingsService.getSettings());
    });

    app.post('/api/settings', (req, res) => {
      const updated = settingsService.updateSettings(req.body);
      mockRobot.updateConfig(updated);
      res.json({ success: true, settings: updated });
    });

    app.post('/api/settings/reset', (req, res) => {
      const defaults = settingsService.resetDefaults();
      mockRobot.updateConfig(defaults);
      res.json({ success: true, settings: defaults });
    });

    // ----------------------------------------------------
    // REAL-TIME SOCKET.IO DISPATCH
    // ----------------------------------------------------

    mockRobot.on('telemetry', (telemetry) => {
      io.emit('robot:telemetry', telemetry);
      io.emit('robot:sensor', telemetry);
      persistenceService.saveTelemetry(telemetry).catch((error) => persistenceService.logSystem(error.message, 'error'));
    });

    mockRobot.on('state', (state) => {
      io.emit('robot:state', state);
      io.emit('robot:status', state);
      persistenceService.saveRobotState(state).catch((error) => persistenceService.logSystem(error.message, 'error'));
    });

    mockRobot.on('event', (evt) => {
      io.emit('system:event', evt);
      io.emit('robot:safety', evt);
      io.emit('robot:alert', evt);
      persistenceService.saveSafetyEvent(evt).catch((error) => persistenceService.logSystem(error.message, 'error'));
    });

    aiService.on('detection', (det) => {
      io.emit('ai:detection', det);
      io.emit('robot:detection', det);
      persistenceService.saveDetection(det, undefined, true).catch((error) => persistenceService.logSystem(error.message, 'error'));
    });

    aiService.on('ambulance_alert', (det) => {
      io.emit('ai:ambulance_alert', det);
    });

    aiService.on('ambulance_cleared', () => {
      io.emit('ai:ambulance_cleared');
    });

    io.on('connection', (socket) => {
      // Send immediate initial sync
      socket.emit('robot:state', robotService.getState());
      socket.emit('robot:camera', { robotId: process.env.DEFAULT_ROBOT_ID || 'PRAHARI-MK1', status: process.env.ROBOT_CAMERA_STREAM_URL ? 'STREAMING' : 'OFFLINE' });
      socket.emit('ai:ambulance_state', { activeAmbulance: aiService.getActiveAmbulance() });

      socket.on('control:move', (data) => {
        const state = robotService.getState();
        if (state.mode === 'RC') return socket.emit('control:error', { error: 'RC_OVERRIDE_ACTIVE' });
        if (state.status === 'OFFLINE') return socket.emit('control:error', { error: 'ROBOT_OFFLINE' });
        if (state.safety?.emergencyStop) return socket.emit('control:error', { error: 'EMERGENCY_STOP_ACTIVE' });
        const result = robotService.sendControl(data.command, data.speed);
        if (!result.success) socket.emit('control:error', { error: result.reason });
      });

      socket.on('control:stop', () => {
        robotService.stop();
      });

      socket.on('control:estop', (data) => {
        robotService.emergencyStop(data?.reason || 'Socket E-Stop');
      });

      socket.on('control:reset_safety', () => {
        robotService.resetSafety();
      });

      socket.on('control:mode', (data) => {
        if (['WEB', 'RC', 'AUTO'].includes(data.mode)) robotService.setMode(data.mode);
      });
    });

    app.use((error, _req, res, _next) => {
      console.error('[API]', error);
      if (res.headersSent) return;
      const status = error.code === 11000 ? 409 : error.name === 'ValidationError' ? 400 : error.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
      res.status(status).json({ error: status === 500 ? 'INTERNAL_SERVER_ERROR' : error.message });
    });

    server.listen(port, hostname, () => {
      console.log(`PRAHARI backend running on http://${hostname}:${port}`);
    });
  } catch (err) {
    console.error('Fatal error starting Next.js server:', err);
    process.exit(1);
  }
}

startServer();
