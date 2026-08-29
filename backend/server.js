import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { db } from './config/db.js';
import { createApiRouter } from './routes/index.js';
import { persistenceService } from './services/persistenceService.js';

import { robotService } from './services/robotService.js';
import { deviceService } from './services/deviceService.js';
import { safetyService } from './services/safetyService.js';
import { detectionService } from './services/detectionService.js';
import { aiService } from './services/aiService.js';
import { aiInferenceService } from './services/aiInferenceService.js';
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
        devicesOnline: Array.from(deviceService.devices.values()).filter((d) => d.status === 'ONLINE').length,
      });
    });

    // Robot State (Current selected or default robot)
    app.get('/api/robot/state', (req, res) => {
      const robotId = req.query.robotId || 'PRAHARI-01';
      const devState = deviceService.getDeviceState(robotId);
      if (devState.status === 'ONLINE' || devState.lastTelemetryAt) {
        return res.json(devState);
      }
      res.json(robotService.getState());
    });

    // Control Robot Mode (WEB / RC / AUTO / DEMO)
    app.post('/api/robot/mode', (req, res) => {
      const { mode, robotId } = req.body;
      if (!mode || !['WEB', 'RC', 'AUTO', 'DEMO'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Must be WEB, RC, AUTO, or DEMO.' });
      }
      const targetId = (robotId || 'PRAHARI-01').trim().toUpperCase();
      const dev = deviceService.getDeviceState(targetId);
      dev.controlMode = mode;
      dev.isDemo = mode === 'DEMO';

      const state = robotService.setMode(mode);
      io.emit('device:mode', { robotId: targetId, controlMode: mode, isDemo: dev.isDemo, timestamp: new Date().toISOString() });
      io.emit('robot:state', state);
      res.json({ success: true, state, device: dev });
    });

    // Control Movement with Device Acknowledgment (FORWARD, REVERSE, LEFT, RIGHT, STOP)
    app.post('/api/robot/control', async (req, res) => {
      const { command, speed, robotId } = req.body;
      const validCommands = ['FORWARD', 'REVERSE', 'LEFT', 'RIGHT', 'STOP'];
      const targetId = (robotId || 'PRAHARI-01').trim().toUpperCase();
      const dev = deviceService.getDeviceState(targetId);
      const state = robotService.getState();

      if (!command || !validCommands.includes(command)) {
        return res.status(400).json({ error: 'command is required (FORWARD, REVERSE, LEFT, RIGHT, STOP)' });
      }

      // Check safety interlocks
      if (dev.status === 'OFFLINE' && state.mode !== 'DEMO') {
        return res.status(409).json({ error: 'ROBOT_OFFLINE', message: 'Physical robot is currently OFFLINE' });
      }
      if (dev.controlMode === 'RC') return res.status(409).json({ error: 'RC_OVERRIDE_ACTIVE' });
      if (dev.safety?.emergencyStop) return res.status(409).json({ error: 'EMERGENCY_STOP_ACTIVE' });

      // Generate unique commandId for tracking physical device ack
      const commandId = `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Broadcast command to hardware listeners via Socket.IO
      io.emit('device:command_out', {
        commandId,
        robotId: targetId,
        command,
        speed: speed || 50,
        timestamp: new Date().toISOString(),
      });

      // Also execute on local adapter
      const simResult = robotService.sendControl(command, speed);

      // Track physical ack if in live device mode
      if (dev.status === 'ONLINE') {
        deviceService.registerOutgoingCommand(commandId, command, 2000);
      }

      persistenceService.startControlSession({ mode: dev.controlMode || 'WEB', isDemo: dev.isDemo }).catch((error) => persistenceService.logSystem(error.message, 'error'));

      res.json({
        success: true,
        commandId,
        status: dev.status === 'ONLINE' ? 'COMMAND_SENT' : 'COMMAND_EXECUTED_SIM',
        command,
        speed,
        robotId: targetId,
      });
    });

    // Emergency Stop Interlock
    app.post('/api/robot/emergency-stop', (req, res) => {
      const { reason, robotId } = req.body || {};
      const targetId = (robotId || 'PRAHARI-01').trim().toUpperCase();
      const dev = deviceService.getDeviceState(targetId);

      dev.safety.emergencyStop = true;
      dev.safety.state = 'EMERGENCY_STOP';
      dev.safety.message = reason || 'Operator Emergency Stop via API';
      dev.safety.updatedAt = new Date().toISOString();

      io.emit('device:safety', { robotId: targetId, safety: dev.safety, timestamp: dev.safety.updatedAt });
      io.emit('system:alert', {
        robotId: targetId,
        type: 'EMERGENCY_STOP',
        severity: 'CRITICAL',
        message: dev.safety.message,
        timestamp: dev.safety.updatedAt,
      });

      const result = robotService.emergencyStop(dev.safety.message);
      io.emit('robot:state', robotService.getState());
      res.json({ success: true, result, device: dev });
    });

    // Reset Safety Interlock
    app.post('/api/robot/reset-safety', (req, res) => {
      const { robotId } = req.body || {};
      const targetId = (robotId || 'PRAHARI-01').trim().toUpperCase();
      const dev = deviceService.getDeviceState(targetId);

      dev.safety.emergencyStop = false;
      dev.safety.obstacleInterlock = false;
      dev.safety.overcurrentInterlock = false;
      dev.safety.undervoltageInterlock = false;
      dev.safety.state = dev.status === 'ONLINE' ? 'SAFE' : 'OFFLINE';
      dev.safety.message = 'Safety interlocks cleared by operator.';
      dev.safety.updatedAt = new Date().toISOString();

      io.emit('device:safety', { robotId: targetId, safety: dev.safety, timestamp: dev.safety.updatedAt });
      const result = robotService.resetSafety();
      io.emit('robot:state', robotService.getState());
      res.json({ success: true, result, device: dev });
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
    app.post('/api/ai/trigger', async (req, res) => {
      const { type } = req.body;
      const detection = await aiService.triggerSyntheticDetection(type || 'ambulance');
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
    // PHYSICAL DEVICE SERVICE -> SOCKET.IO EVENT BRIDGE
    // ----------------------------------------------------

    deviceService.on('device:telemetry', (data) => {
      io.emit('device:telemetry', data);
      io.emit('robot:telemetry', data);
    });

    deviceService.on('device:heartbeat', (data) => {
      io.emit('device:heartbeat', data);
    });

    deviceService.on('device:battery', (data) => {
      io.emit('device:battery', data);
    });

    deviceService.on('device:motor', (data) => {
      io.emit('device:motor', data);
    });

    deviceService.on('device:sensor', (data) => {
      io.emit('device:sensor', data);
      io.emit('robot:sensor', data);
    });

    deviceService.on('device:gps', (data) => {
      io.emit('device:gps', data);
    });

    deviceService.on('device:imu', (data) => {
      io.emit('device:imu', data);
    });

    deviceService.on('device:status', (data) => {
      io.emit('device:status', data);
      io.emit('robot:status', data);
    });

    deviceService.on('device:safety', (data) => {
      io.emit('device:safety', data);
      io.emit('robot:safety', data);
    });

    deviceService.on('device:mode', (data) => {
      io.emit('device:mode', data);
    });

    deviceService.on('device:ack', (data) => {
      io.emit('device:ack', data);
    });

    deviceService.on('system:alert', (data) => {
      io.emit('system:alert', data);
      io.emit('system:event', data);
    });

    // ----------------------------------------------------
    // SIMULATOR / LEGACY EVENT DISPATCH
    // ----------------------------------------------------

    mockRobot.on('telemetry', (telemetry) => {
      // If no live physical telemetry was received in the last 3s, send simulator telemetry
      const primaryDev = deviceService.getDeviceState('PRAHARI-01');
      if (primaryDev.status !== 'ONLINE') {
        io.emit('robot:telemetry', telemetry);
      }
    });

    mockRobot.on('state', (state) => {
      const primaryDev = deviceService.getDeviceState('PRAHARI-01');
      if (primaryDev.status !== 'ONLINE') {
        io.emit('robot:state', state);
      }
    });

    mockRobot.on('event', (evt) => {
      io.emit('system:event', evt);
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
      socket.emit('robot:state', deviceService.getDeviceState('PRAHARI-01'));
      socket.emit('devices:list', deviceService.getAllDevices());
      socket.emit('ai:status', aiInferenceService.getStatus());
      socket.emit('ai:ambulance_state', { activeAmbulance: aiInferenceService.getStatus().activeAmbulance || aiService.getActiveAmbulance() });

      // Real-time camera stream frame processing via WebSocket
      socket.on('camera:frame', async (data) => {
        try {
          const result = await aiInferenceService.processFrame(data, io);
          socket.emit('ai:frame_result', result);
        } catch (err) {
          socket.emit('ai:frame_error', { error: err.message });
        }
      });

      socket.on('control:move', (data) => {
        const targetId = (data.robotId || 'PRAHARI-01').trim().toUpperCase();
        const dev = deviceService.getDeviceState(targetId);
        if (dev.status === 'OFFLINE' && dev.controlMode !== 'DEMO') {
          return socket.emit('control:error', { error: 'ROBOT_OFFLINE' });
        }
        if (dev.safety?.emergencyStop) return socket.emit('control:error', { error: 'EMERGENCY_STOP_ACTIVE' });

        const commandId = `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        io.emit('device:command_out', {
          commandId,
          robotId: targetId,
          command: data.command,
          speed: data.speed || 50,
          timestamp: new Date().toISOString(),
        });
        robotService.sendControl(data.command, data.speed);
      });

      socket.on('control:stop', (data) => {
        robotService.stop();
      });

      socket.on('control:estop', (data) => {
        const targetId = (data?.robotId || 'PRAHARI-01').trim().toUpperCase();
        const dev = deviceService.getDeviceState(targetId);
        dev.safety.emergencyStop = true;
        io.emit('device:safety', { robotId: targetId, safety: dev.safety, timestamp: new Date().toISOString() });
        robotService.emergencyStop(data?.reason || 'Socket E-Stop');
      });

      socket.on('control:reset_safety', (data) => {
        const targetId = (data?.robotId || 'PRAHARI-01').trim().toUpperCase();
        const dev = deviceService.getDeviceState(targetId);
        dev.safety.emergencyStop = false;
        io.emit('device:safety', { robotId: targetId, safety: dev.safety, timestamp: new Date().toISOString() });
        robotService.resetSafety();
      });
    });

    server.listen(port, hostname, () => {
      console.log(`PRAHARI backend running on http://${hostname}:${port}`);
    });
  } catch (error) {
    console.error('Fatal backend error:', error);
    process.exit(1);
  }
}

startServer();
