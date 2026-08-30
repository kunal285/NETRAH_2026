import express from 'express';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { db } from './config/db.js';
import { createApiRouter } from './routes/index.js';
import { s3Service } from './services/s3Service.js';
import { deviceService } from './services/deviceService.js';
import { robotService } from './services/robotService.js';
import { detectionService } from './services/detectionService.js';
import { inferenceService } from './services/ai/inferenceService.js';
import { arduinoSerialService } from './services/arduinoSerialService.js';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);

async function startServer() {
  try {
    await db.connect();

    const app = express();
    const server = http.createServer(app);

    // Setup CORS for REST APIs
    app.use(
      cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-device-token', 'x-robot-key'],
      })
    );

    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ extended: true, limit: '25mb' }));

    // Setup Socket.IO
    const io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    app.set('io', io);
    arduinoSerialService.setSocketIO(io);

    // Mount Master API Router under /api
    app.use('/api', createApiRouter());

    // Root health route
    app.get('/health', async (_req, res) => {
      const dbStatus = db.getStatus();
      const s3Status = await s3Service.testConnection();
      const robotState = deviceService.getDeviceState('PRAHARI-01');
      const tel = arduinoSerialService.getTelemetry();

      res.json({
        success: true,
        service: 'PRAHARI Command Center Backend',
        architecture: 'Arduino Nano + 2x BTS7960 + ESP32-CAM + Passive Caster',
        status: 'healthy',
        backend: 'ok',
        database: dbStatus.connected ? 'ok' : 'fallback',
        socket: 'ok',
        s3: s3Status.connected ? 'ok' : 'degraded',
        ai: 'ok',
        arduinoNano: tel.arduinoStatus.toLowerCase(),
        esp32Cam: process.env.ROBOT_CAMERA_STREAM_URL || process.env.ESP32_CAM_STREAM_URL ? 'streaming' : 'offline',
        robot: robotState.status.toLowerCase(),
        mode: tel.mode,
        timestamp: new Date().toISOString(),
      });
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
      io.emit('robot:status', { robotId: data.robotId, status: data.status, timestamp: data.lastHeartbeatAt });
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
      io.emit('command:ack', data);
    });

    deviceService.on('system:alert', (data) => {
      io.emit('system:alert', data);
      io.emit('system:event', data);
    });

    // ----------------------------------------------------
    // SOCKET.IO CLIENT CONNECTION HANDLER
    // ----------------------------------------------------

    io.on('connection', (socket) => {
      const dev = deviceService.getDeviceState('PRAHARI-01');

      // Immediate state sync on connect
      socket.emit('robot:state', dev);
      socket.emit('robot:status', { robotId: dev.robotId, status: dev.status, timestamp: dev.lastHeartbeatAt });
      socket.emit('robot:telemetry', {
        robotId: dev.robotId,
        status: dev.status,
        batteryVoltage: dev.battery.voltage,
        batteryPercentage: dev.battery.percentage,
        batteryCurrent: dev.battery.current,
        leftMotorCurrent: dev.motors.left.current,
        rightMotorCurrent: dev.motors.right.current,
        leftMotorPWM: dev.motors.left.pwm,
        rightMotorPWM: dev.motors.right.pwm,
        leftMotorSpeed: dev.motors.left.speed,
        rightMotorSpeed: dev.motors.right.speed,
        obstacleDistance: dev.ultrasonic.frontDistanceM,
        temperature: dev.battery.temperature,
        wifiRSSI: dev.wifiRSSI,
        controlMode: dev.controlMode,
        timestamp: dev.lastTelemetryAt || new Date().toISOString(),
      });
      socket.emit('devices:list', deviceService.getAllDevices());
      socket.emit('ai:status', {
        online: true,
        model: 'YOLOv8',
        ocr: 'ONLINE',
        inference: 'ACTIVE',
        status: 'AI ONLINE',
        stats: detectionService.getStats(),
      });
      socket.emit('camera:status', {
        status: process.env.ROBOT_CAMERA_STREAM_URL ? '● LIVE' : 'CAMERA OFFLINE',
        streamUrl: process.env.ROBOT_CAMERA_STREAM_URL || null,
        fps: 30,
        resolution: '1920x1080',
      });

      // Frame ingestion from video stream / AI agent
      socket.on('camera:frame', async (data) => {
        try {
          const result = await inferenceService.processFrame(data, io);
          socket.emit('ai:frame_result', result);
        } catch (err) {
          socket.emit('ai:frame_error', { error: err.message });
        }
      });

      socket.on('system:ping', (callback) => {
        if (typeof callback === 'function') {
          callback(Date.now());
        }
      });

      // Movement & Differential Drive Controls
      socket.on('control:drive_vector', (data) => {
        const targetId = (data?.robotId || 'PRAHARI-01').trim().toUpperCase();
        const devState = deviceService.getDeviceState(targetId);

        if (devState.safety?.emergencyStop) {
          return socket.emit('command:error', { error: 'EMERGENCY_STOP_ACTIVE' });
        }

        const commandId = `CMD-${crypto.randomUUID()}`;
        const commandPayload = {
          commandId,
          robotId: targetId,
          type: 'drive',
          command: 'DRIVE_VECTOR',
          source: data?.source || 'web',
          mode: devState.controlMode || 'WEB',
          throttle: data?.throttle !== undefined ? Number(data.throttle) : 0,
          steering: data?.steering !== undefined ? Number(data.steering) : 0,
          speed: data?.speed || 70,
          timestamp: new Date().toISOString(),
        };        io.emit('command:sent', commandPayload);
        io.emit('device:command_out', commandPayload);
        robotService.sendControl('DRIVE_VECTOR', data?.speed || 70, {
          throttle: commandPayload.throttle,
          steering: commandPayload.steering,
        });
        arduinoSerialService.sendDriveVector(commandPayload.throttle, commandPayload.steering, data?.speed || 70);
      });

      socket.on('control:move', (data) => {
        const targetId = (data.robotId || 'PRAHARI-01').trim().toUpperCase();
        const devState = deviceService.getDeviceState(targetId);

        if (devState.safety?.emergencyStop) {
          return socket.emit('command:error', { error: 'EMERGENCY_STOP_ACTIVE' });
        }

        const commandId = `CMD-${crypto.randomUUID()}`;
        const commandPayload = {
          commandId,
          robotId: targetId,
          command: String(data.command).toUpperCase(),
          speed: Number(data.speed) || 50,
          timestamp: new Date().toISOString(),
        };

        io.emit('command:sent', commandPayload);
        io.emit('device:command_out', commandPayload);
        robotService.sendControl(data.command, data.speed);
      });

      socket.on('control:stop', (data) => {
        const targetId = (data?.robotId || 'PRAHARI-01').trim().toUpperCase();
        const commandPayload = {
          commandId: `CMD-${crypto.randomUUID()}`,
          robotId: targetId,
          type: 'drive',
          command: 'STOP',
          throttle: 0,
          steering: 0,
          speed: 0,
          timestamp: new Date().toISOString(),
        };

        io.emit('command:sent', commandPayload);
        io.emit('device:command_out', commandPayload);
        robotService.stop();
        arduinoSerialService.stopMotors();
      });

      socket.on('control:estop', (data) => {
        const targetId = (data?.robotId || 'PRAHARI-01').trim().toUpperCase();
        const devState = deviceService.getDeviceState(targetId);
        devState.safety.emergencyStop = true;
        devState.safety.state = 'EMERGENCY_STOP';
        devState.safety.message = data?.reason || 'Operator E-Stop Triggered';
        devState.safety.updatedAt = new Date().toISOString();

        io.emit('device:safety', { robotId: targetId, safety: devState.safety, timestamp: devState.safety.updatedAt });
        io.emit('robot:safety', { robotId: targetId, safety: devState.safety, timestamp: devState.safety.updatedAt });
        io.emit('device:command_out', {
          commandId: `CMD-${crypto.randomUUID()}`,
          robotId: targetId,
          command: 'EMERGENCY_STOP',
          speed: 0,
          reason: devState.safety.message,
        });

        robotService.emergencyStop(devState.safety.message);
        arduinoSerialService.emergencyStop(devState.safety.message);
      });
;

      socket.on('control:reset_safety', (data) => {
        const targetId = (data?.robotId || 'PRAHARI-01').trim().toUpperCase();
        const devState = deviceService.getDeviceState(targetId);
        devState.safety.emergencyStop = false;
        devState.safety.state = devState.status === 'ONLINE' ? 'SAFE' : 'OFFLINE';
        devState.safety.message = 'Safety interlocks reset by operator';
        devState.safety.updatedAt = new Date().toISOString();

        io.emit('device:safety', { robotId: targetId, safety: devState.safety, timestamp: devState.safety.updatedAt });
        io.emit('robot:safety', { robotId: targetId, safety: devState.safety, timestamp: devState.safety.updatedAt });
        robotService.resetSafety();
      });

      socket.on('control:mode', (data) => {
        const targetId = (data?.robotId || 'PRAHARI-01').trim().toUpperCase();
        const devState = deviceService.getDeviceState(targetId);
        if (data?.mode) {
          devState.controlMode = data.mode.toUpperCase();
          io.emit('device:mode', { robotId: targetId, controlMode: devState.controlMode, timestamp: new Date().toISOString() });
          robotService.setMode(devState.controlMode);
        }
      });
    });

    // Global Express Error Handler
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      console.error(`[PRAHARI] Route error [${status}]:`, err.message);
      res.status(status).json({
        error: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred',
      });
    });

    server.listen(port, hostname, async () => {
      console.log('==================================================');
      console.log('  PRAHARI TRAFFIC-POLICE ROBOT COMMAND CENTER     ');
      console.log('==================================================');
      console.log(`[BACKEND] Listening on http://${hostname}:${port}`);
      console.log(
        db.getStatus().connected
          ? `[DATABASE] MongoDB Connected`
          : `[DATABASE] In-memory persistence active (MongoDB offline/fallback)`
      );
      const s3Check = await s3Service.testConnection();
      console.log(
        s3Check.connected
          ? `[S3] AWS S3 bucket connected: ${s3Check.bucket}`
          : `[S3] AWS S3 in local fallback mode (${s3Check.error || 'No credentials'})`
      );
      console.log(`[SOCKET] Socket.IO real-time engine ready`);
      console.log(`[ROBOT STREAM] Configured URL: ${process.env.ROBOT_CAMERA_STREAM_URL || 'Not configured (use env)'}`);
    });
  } catch (error) {
    console.error('Fatal backend error:', error);
    process.exit(1);
  }
}

startServer();
