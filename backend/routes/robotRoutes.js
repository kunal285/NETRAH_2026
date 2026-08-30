import express from 'express';
import crypto from 'crypto';
import { deviceService } from '../services/deviceService.js';
import { robotService } from '../services/robotService.js';

export const robotRouter = express.Router();

/**
 * Helper to calculate differential / skid-steer motor PWM speeds
 */
function computeSkidSteerMotors(command, speed = 50, vector = null) {
  const baseSpeed = Math.max(0, Math.min(100, Number(speed) || 50));
  const maxPwm = Math.round((baseSpeed / 100) * 255);

  let leftPwm = 0;
  let rightPwm = 0;
  const cmd = String(command).toUpperCase();

  if (cmd === 'FORWARD') {
    leftPwm = maxPwm;
    rightPwm = maxPwm;
  } else if (cmd === 'BACKWARD' || cmd === 'REVERSE') {
    leftPwm = -maxPwm;
    rightPwm = -maxPwm;
  } else if (cmd === 'LEFT') {
    leftPwm = -Math.round(maxPwm * 0.7);
    rightPwm = maxPwm;
  } else if (cmd === 'RIGHT') {
    leftPwm = maxPwm;
    rightPwm = -Math.round(maxPwm * 0.7);
  } else if (cmd === 'DRIVE_VECTOR' && vector) {
    const throttle = Number(vector.throttle || 0);
    const steering = Number(vector.steering || 0);
    const leftVal = Math.max(-1.0, Math.min(1.0, throttle + steering));
    const rightVal = Math.max(-1.0, Math.min(1.0, throttle - steering));
    leftPwm = Math.round(leftVal * maxPwm);
    rightPwm = Math.round(rightVal * maxPwm);
  } else {
    // STOP
    leftPwm = 0;
    rightPwm = 0;
  }

  return {
    leftPwm,
    rightPwm,
    leftSpeed: Math.round((leftPwm / 255) * 100),
    rightSpeed: Math.round((rightPwm / 255) * 100),
  };
}

/**
 * GET /api/robot/status
 * Heartbeat status check (ONLINE / OFFLINE / CONNECTING)
 */
robotRouter.get('/status', (req, res) => {
  const robotId = req.query.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-01';
  const dev = deviceService.getDeviceState(robotId);

  res.json({
    success: true,
    robotId: dev.robotId,
    status: dev.status,
    controlMode: dev.controlMode,
    lastHeartbeatAt: dev.lastHeartbeatAt,
    lastTelemetryAt: dev.lastTelemetryAt,
    wifiRSSI: dev.wifiRSSI,
    uptimeSeconds: dev.uptimeSeconds,
    firmwareVersion: dev.firmwareVersion,
    safety: dev.safety,
  });
});

/**
 * GET /api/robot/telemetry
 * Full live telemetry snapshot
 */
robotRouter.get('/telemetry', (req, res) => {
  const robotId = req.query.robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-01';
  const dev = deviceService.getDeviceState(robotId);

  res.json({
    success: true,
    robotId: dev.robotId,
    status: dev.status,
    battery: dev.battery,
    motors: dev.motors,
    ultrasonic: dev.ultrasonic,
    gps: dev.gps,
    imu: dev.imu,
    wifi: {
      rssi: dev.wifiRSSI,
      uptimeSeconds: dev.uptimeSeconds,
      firmwareVersion: dev.firmwareVersion,
      ipAddress: dev.ipAddress,
    },
    safety: dev.safety,
    timestamp: dev.lastTelemetryAt || new Date().toISOString(),
  });
});

/**
 * POST /api/robot/heartbeat
 * Physical Raspberry Pi / ESP32 heartbeat ingestion
 */
robotRouter.post('/heartbeat', (req, res) => {
  try {
    const senderIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const result = deviceService.processHeartbeat(req.body, senderIp);
    const io = req.app.get('io');
    if (io) {
      io.emit('robot:status', {
        robotId: result.robotId,
        status: result.status,
        timestamp: result.timestamp,
      });
      io.emit('robot:heartbeat', req.body);
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/robot/command
 * Send real-time differential drive command to robot
 */
robotRouter.post('/command', async (req, res) => {
  try {
    const { command, speed, robotId, throttle, steering, vector } = req.body;
    const targetId = (robotId || process.env.DEFAULT_ROBOT_ID || 'PRAHARI-01').trim().toUpperCase();
    const dev = deviceService.getDeviceState(targetId);
    const io = req.app.get('io');

    const cmd = (command || (throttle !== undefined ? 'DRIVE_VECTOR' : 'STOP')).toUpperCase();
    const driveVector = vector || (throttle !== undefined || steering !== undefined ? { throttle, steering } : null);

    // Calculate differential motor parameters
    const motorCalc = computeSkidSteerMotors(cmd, speed || 60, driveVector);

    // Safety checks
    if (dev.safety?.emergencyStop) {
      if (io) io.emit('command:error', { error: 'EMERGENCY_STOP_ACTIVE', robotId: targetId });
      return res.status(409).json({ error: 'EMERGENCY_STOP_ACTIVE', message: 'Emergency Stop is currently active.' });
    }

    const commandId = `CMD-${crypto.randomUUID()}`;
    const commandPayload = {
      commandId,
      robotId: targetId,
      command: cmd,
      speed: speed || 60,
      vector: driveVector,
      motors: motorCalc,
      timestamp: new Date().toISOString(),
    };

    if (io) {
      io.emit('command:sent', commandPayload);
      io.emit('device:command_out', commandPayload);
    }

    // Local simulator execution update
    robotService.sendControl(cmd, speed || 60, driveVector);

    // Await ack if device is live
    let ackResult = { status: 'COMMAND_SENT', success: true };
    if (dev.status === 'ONLINE') {
      deviceService.registerOutgoingCommand(commandId, cmd, 1500)
        .then((ack) => {
          if (io) io.emit('command:ack', { commandId, status: ack.status, robotId: targetId });
        })
        .catch(() => {});
    }

    res.json({
      success: true,
      commandId,
      robotId: targetId,
      command: cmd,
      motors: motorCalc,
      status: ackResult.status,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
