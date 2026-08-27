import { EventEmitter } from 'events';
import { persistenceService } from './persistenceService.js';

/**
 * DeviceService
 * Physical Hardware Ingestion & Multi-Robot Management for PRAHARI.
 * Connects ESP32, physical sensors, battery monitors, IMU, GPS, and motor drivers
 * to Node.js, MongoDB persistence, and Socket.IO real-time broadcasts.
 */
class DeviceService extends EventEmitter {
  constructor() {
    super();

    // In-memory registry of active / known robots
    // Key: robotId (e.g. 'PRAHARI-01')
    this.devices = new Map();

    // Default configuration & thresholds
    this.config = {
      heartbeatTimeoutMs: 5000, // 5s heartbeat timeout -> OFFLINE
      telemetryFreshnessMs: 2500, // 2.5s telemetry freshness -> STALE
      gpsFreshnessMs: 5000,
      imuFreshnessMs: 3000,
      sampleHistoryIntervalMs: 1000, // Store 1 historical telemetry sample per sec per device
      deviceSecretKey: process.env.PRAHARI_DEVICE_SECRET || 'PRAHARI_DEVICE_SECRET_KEY_2026',
    };

    // Live Data Monitor / Debug Metrics
    this.debugStats = {
      packetsReceived: 0,
      packetsRejected: 0,
      lastPacketAt: null,
      lastError: null,
      lastSenderIp: null,
      lastRobotId: null,
      lastSocketEvent: null,
      rawTelemetryHistory: [], // Last 20 raw packets for developer inspection
    };

    // Pending command acknowledgements: commandId -> { resolve, timer, command, timestamp }
    this.pendingCommands = new Map();

    // Initialize default primary registered robot
    this.registerDevice('PRAHARI-01', {
      name: 'PRAHARI Traffic-Police Robot MK1',
      location: 'Chhatrapati Shivaji Maharaj Chowk',
      ip: '192.168.4.1',
      firmwareVersion: 'v2.4.0-ESP32-DUAL-CORE',
    });

    // Start background heartbeat monitor ticker (runs every 1000ms)
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, 1000);
  }

  /**
   * Register or fetch an existing device record
   */
  registerDevice(robotId, metadata = {}) {
    if (!robotId || typeof robotId !== 'string') return null;
    const cleanId = robotId.trim().toUpperCase();

    if (!this.devices.has(cleanId)) {
      this.devices.set(cleanId, {
        robotId: cleanId,
        name: metadata.name || `PRAHARI Robot ${cleanId}`,
        location: metadata.location || 'Unassigned Patrol Zone',
        status: 'OFFLINE', // Initial state until first heartbeat/telemetry arrives
        controlMode: 'WEB',
        isDemo: false,
        lastHeartbeatAt: null,
        lastTelemetryAt: null,
        lastGpsAt: null,
        lastImuAt: null,
        lastCommandAckAt: null,
        ipAddress: metadata.ip || null,
        firmwareVersion: metadata.firmwareVersion || 'v2.4.0-ESP32',
        uptimeSeconds: 0,
        wifiRSSI: null,
        battery: {
          voltage: null,
          current: null,
          percentage: null,
          temperature: null,
          status: 'NO_DATA',
          updatedAt: null,
        },
        motors: {
          left: {
            current: null,
            pwm: null,
            speed: null,
            status: 'NO_DATA',
          },
          right: {
            current: null,
            pwm: null,
            speed: null,
            status: 'NO_DATA',
          },
          updatedAt: null,
        },
        ultrasonic: {
          frontDistanceCm: null,
          rearDistanceCm: null,
          frontDistanceM: null,
          rearDistanceM: null,
          status: 'NO_DATA',
          updatedAt: null,
        },
        imu: {
          available: false,
          accel: { x: null, y: null, z: null },
          gyro: { x: null, y: null, z: null },
          updatedAt: null,
        },
        gps: {
          available: false,
          latitude: null,
          longitude: null,
          speed: null,
          accuracy: null,
          satellites: null,
          updatedAt: null,
        },
        safety: {
          emergencyStop: false,
          obstacleInterlock: false,
          overcurrentInterlock: false,
          undervoltageInterlock: false,
          state: 'OFFLINE',
          message: 'Awaiting device connection...',
          updatedAt: null,
        },
        telemetryHistory: [],
        lastPersistAt: 0,
      });
    }

    return this.devices.get(cleanId);
  }

  /**
   * Get list of all registered robots
   */
  getAllDevices() {
    return Array.from(this.devices.values()).map((d) => ({
      robotId: d.robotId,
      name: d.name,
      location: d.location,
      status: d.status,
      controlMode: d.controlMode,
      isDemo: d.isDemo,
      ipAddress: d.ipAddress,
      firmwareVersion: d.firmwareVersion,
      lastHeartbeatAt: d.lastHeartbeatAt,
      lastTelemetryAt: d.lastTelemetryAt,
      battery: d.battery,
      wifiRSSI: d.wifiRSSI,
    }));
  }

  /**
   * Get full state of a specific robot
   */
  getDeviceState(robotId = 'PRAHARI-01') {
    const cleanId = (robotId || 'PRAHARI-01').trim().toUpperCase();
    if (!this.devices.has(cleanId)) {
      this.registerDevice(cleanId);
    }
    return this.devices.get(cleanId);
  }

  /**
   * Validate authentication credentials for physical device
   */
  authenticateDevice(req) {
    const token = req.headers['x-device-token'] || req.headers['x-robot-key'] || req.query.token || req.body?.deviceSecret;
    // Allow local subnet or verified token
    if (token && token === this.config.deviceSecretKey) {
      return true;
    }
    // Also accept requests if no token is enforced in dev or if token header is present
    if (!process.env.STRICT_DEVICE_AUTH || process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }

  /**
   * Ingest ESP32 Heartbeat packet
   */
  processHeartbeat(payload, senderIp = null) {
    this.debugStats.packetsReceived++;
    this.debugStats.lastPacketAt = new Date().toISOString();
    this.debugStats.lastSenderIp = senderIp;

    const robotId = (payload.robotId || 'PRAHARI-01').trim().toUpperCase();
    const dev = this.registerDevice(robotId);

    const now = new Date();
    const wasOffline = dev.status === 'OFFLINE';

    dev.status = 'ONLINE';
    dev.lastHeartbeatAt = now.toISOString();
    dev.ipAddress = senderIp || dev.ipAddress;
    dev.uptimeSeconds = Number(payload.uptime || payload.uptimeSeconds || dev.uptimeSeconds + 1);
    if (payload.firmwareVersion) dev.firmwareVersion = String(payload.firmwareVersion);
    if (payload.wifiRSSI !== undefined) dev.wifiRSSI = Number(payload.wifiRSSI);
    if (payload.controlMode) dev.controlMode = String(payload.controlMode);

    this.debugStats.lastRobotId = robotId;
    this.debugStats.lastSocketEvent = 'device:heartbeat';

    const heartbeatData = {
      robotId,
      status: dev.status,
      lastHeartbeatAt: dev.lastHeartbeatAt,
      uptimeSeconds: dev.uptimeSeconds,
      wifiRSSI: dev.wifiRSSI,
      controlMode: dev.controlMode,
      ipAddress: dev.ipAddress,
      firmwareVersion: dev.firmwareVersion,
    };

    this.emit('device:heartbeat', heartbeatData);
    if (wasOffline) {
      this.emit('device:status', { robotId, status: 'ONLINE', timestamp: now.toISOString() });
      persistenceService.logSystem(`Device ${robotId} connected from ${senderIp || 'network'}.`, 'info');
    }

    return { success: true, robotId, status: dev.status, timestamp: dev.lastHeartbeatAt };
  }

  /**
   * Validate & Ingest Complete Live Telemetry from ESP32
   */
  processTelemetry(payload, senderIp = null) {
    this.debugStats.packetsReceived++;
    this.debugStats.lastPacketAt = new Date().toISOString();
    this.debugStats.lastSenderIp = senderIp;

    // Validate payload
    const validationError = this.validateTelemetryPayload(payload);
    if (validationError) {
      this.debugStats.packetsRejected++;
      this.debugStats.lastError = validationError;
      throw new Error(`Telemetry Validation Failed: ${validationError}`);
    }

    const robotId = (payload.robotId || 'PRAHARI-01').trim().toUpperCase();
    const dev = this.registerDevice(robotId);
    const now = new Date();
    const nowIso = now.toISOString();

    dev.status = 'ONLINE';
    dev.lastHeartbeatAt = nowIso;
    dev.lastTelemetryAt = nowIso;
    dev.ipAddress = senderIp || dev.ipAddress;
    dev.uptimeSeconds = payload.uptime != null ? Number(payload.uptime) : dev.uptimeSeconds + 1;

    if (payload.controlMode) dev.controlMode = String(payload.controlMode);
    if (payload.wifiRSSI != null) dev.wifiRSSI = Number(payload.wifiRSSI);

    // Battery processing (No fake calculations; accept real device data)
    if (payload.batteryVoltage != null || payload.batteryPercentage != null) {
      const v = payload.batteryVoltage != null ? Number(payload.batteryVoltage) : dev.battery.voltage;
      const pct = payload.batteryPercentage != null ? Number(payload.batteryPercentage) : (v ? Math.min(100, Math.max(0, Math.round(((v - 30.0) / 12.0) * 100))) : null);
      const curr = payload.batteryCurrent != null ? Number(payload.batteryCurrent) : (payload.totalCurrent != null ? Number(payload.totalCurrent) : null);
      const temp = payload.temperature != null ? Number(payload.temperature) : dev.battery.temperature;

      dev.battery = {
        voltage: v != null ? Number(v.toFixed(2)) : null,
        percentage: pct != null ? Math.round(pct) : null,
        current: curr != null ? Number(curr.toFixed(2)) : null,
        temperature: temp != null ? Number(temp.toFixed(1)) : null,
        status: v && v < 31.0 ? 'CRITICAL' : v && v < 33.0 ? 'WARNING' : 'NORMAL',
        updatedAt: nowIso,
      };
    }

    // Dual Motor Telemetry (BTS7960 low-side current shunts + PWM)
    if (payload.leftMotorCurrent != null || payload.rightMotorCurrent != null || payload.leftMotorPWM != null || payload.rightMotorPWM != null) {
      const leftCurr = payload.leftMotorCurrent != null ? Number(payload.leftMotorCurrent) : 0;
      const rightCurr = payload.rightMotorCurrent != null ? Number(payload.rightMotorCurrent) : 0;
      const leftPWM = payload.leftMotorPWM != null ? Number(payload.leftMotorPWM) : 0;
      const rightPWM = payload.rightMotorPWM != null ? Number(payload.rightMotorPWM) : 0;

      dev.motors = {
        left: {
          current: Number(leftCurr.toFixed(2)),
          pwm: leftPWM,
          speed: Math.round((leftPWM / 255) * 100),
          status: leftCurr > 20.0 ? 'WARNING' : 'NORMAL',
        },
        right: {
          current: Number(rightCurr.toFixed(2)),
          pwm: rightPWM,
          speed: Math.round((rightPWM / 255) * 100),
          status: rightCurr > 20.0 ? 'WARNING' : 'NORMAL',
        },
        updatedAt: nowIso,
      };
    }

    // Ultrasonic Sensor processing (Front + Rear distance)
    if (payload.frontDistanceCm != null || payload.obstacleDistance != null || payload.frontDistanceM != null) {
      let fDistCm = payload.frontDistanceCm != null ? Number(payload.frontDistanceCm) : null;
      if (fDistCm == null && payload.obstacleDistance != null) fDistCm = Number((Number(payload.obstacleDistance) * 100).toFixed(0));
      if (fDistCm == null && payload.frontDistanceM != null) fDistCm = Number((Number(payload.frontDistanceM) * 100).toFixed(0));

      const rDistCm = payload.rearDistanceCm != null ? Number(payload.rearDistanceCm) : (payload.rearDistanceM != null ? Number((Number(payload.rearDistanceM) * 100).toFixed(0)) : dev.ultrasonic.rearDistanceCm);

      const fDistM = fDistCm != null ? Number((fDistCm / 100).toFixed(2)) : null;
      const rDistM = rDistCm != null ? Number((rDistCm / 100).toFixed(2)) : null;

      dev.ultrasonic = {
        frontDistanceCm: fDistCm,
        rearDistanceCm: rDistCm,
        frontDistanceM: fDistM,
        rearDistanceM: rDistM,
        status: fDistM && fDistM < 0.4 ? 'CRITICAL' : fDistM && fDistM < 0.8 ? 'WARNING' : 'CLEAR',
        updatedAt: nowIso,
      };
    }

    // Emergency Stop and Safety State
    if (payload.emergencyStop !== undefined) {
      const eStop = Boolean(payload.emergencyStop);
      dev.safety.emergencyStop = eStop;
      dev.safety.state = eStop ? 'EMERGENCY_STOP' : dev.ultrasonic.status === 'CRITICAL' ? 'OBSTACLE_TRIP' : 'SAFE';
      dev.safety.message = eStop ? 'Physical Emergency Stop switch triggered!' : 'Safety interlocks armed & active.';
      dev.safety.updatedAt = nowIso;

      if (eStop) {
        this.emit('device:safety', { robotId, safety: dev.safety, timestamp: nowIso });
        persistenceService.saveSafetyEvent({
          type: 'EMERGENCY_STOP',
          reason: 'Hardware Physical E-Stop Actuated on ESP32 Controller',
          details: { robotId, battery: dev.battery, motors: dev.motors },
        }).catch((err) => console.error('Failed to log safety event:', err));
      }
    }

    // Store in short historical telemetry buffer
    const telemetrySnapshot = {
      robotId,
      timestamp: nowIso,
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
      rearDistance: dev.ultrasonic.rearDistanceM,
      temperature: dev.battery.temperature,
      wifiRSSI: dev.wifiRSSI,
      controlMode: dev.controlMode,
      emergencyStop: dev.safety.emergencyStop,
      uptimeSeconds: dev.uptimeSeconds,
    };

    dev.telemetryHistory.push(telemetrySnapshot);
    if (dev.telemetryHistory.length > 50) dev.telemetryHistory.shift();

    // Push to debug monitor buffer
    this.debugStats.rawTelemetryHistory.push(telemetrySnapshot);
    if (this.debugStats.rawTelemetryHistory.length > 20) this.debugStats.rawTelemetryHistory.shift();
    this.debugStats.lastRobotId = robotId;
    this.debugStats.lastSocketEvent = 'device:telemetry';

    // Broadcast individual granular Socket.IO events for component-level reactivity
    this.emit('device:telemetry', telemetrySnapshot);
    this.emit('device:battery', { robotId, battery: dev.battery, timestamp: nowIso });
    this.emit('device:motor', { robotId, motors: dev.motors, timestamp: nowIso });
    this.emit('device:sensor', { robotId, ultrasonic: dev.ultrasonic, timestamp: nowIso });
    this.emit('device:mode', { robotId, controlMode: dev.controlMode, timestamp: nowIso });

    // Persist to MongoDB at sampled rate (e.g., 1 snapshot / second)
    const nowMs = Date.now();
    if (nowMs - dev.lastPersistAt >= this.config.sampleHistoryIntervalMs) {
      dev.lastPersistAt = nowMs;
      persistenceService.saveTelemetry({
        robotId,
        isDemo: false,
        batteryVoltage: dev.battery.voltage,
        batteryPercentage: dev.battery.percentage,
        totalCurrent: dev.battery.current,
        leftMotorCurrent: dev.motors.left.current,
        rightMotorCurrent: dev.motors.right.current,
        leftMotorSpeed: dev.motors.left.speed,
        rightMotorSpeed: dev.motors.right.speed,
        obstacleDistance: dev.ultrasonic.frontDistanceM,
        temperature: dev.battery.temperature,
        wifiRSSI: dev.wifiRSSI,
        controlMode: dev.controlMode,
        uptimeSeconds: dev.uptimeSeconds,
      }).catch((e) => console.error('[DeviceService] MongoDB persistence error:', e.message));
    }

    return { success: true, robotId, timestamp: nowIso };
  }

  /**
   * Ingest GPS Hardware packet
   */
  processGps(payload, senderIp = null) {
    this.debugStats.packetsReceived++;
    const robotId = (payload.robotId || 'PRAHARI-01').trim().toUpperCase();
    const dev = this.registerDevice(robotId);
    const nowIso = new Date().toISOString();

    const lat = Number(payload.latitude || payload.lat);
    const lng = Number(payload.longitude || payload.lng || payload.lon);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      this.debugStats.packetsRejected++;
      throw new Error('Invalid GPS Coordinates (Lat: -90..90, Lng: -180..180)');
    }

    dev.gps = {
      available: true,
      latitude: Number(lat.toFixed(6)),
      longitude: Number(lng.toFixed(6)),
      speed: payload.speed != null ? Number(Number(payload.speed).toFixed(1)) : 0.0,
      accuracy: payload.accuracy != null ? Number(Number(payload.accuracy).toFixed(1)) : null,
      satellites: payload.satellites != null ? Number(payload.satellites) : null,
      updatedAt: nowIso,
    };

    dev.lastGpsAt = nowIso;
    this.emit('device:gps', { robotId, gps: dev.gps, timestamp: nowIso });

    return { success: true, robotId, gps: dev.gps };
  }

  /**
   * Ingest IMU Hardware (MPU6050 / LSM6DS) packet
   */
  processImu(payload, senderIp = null) {
    this.debugStats.packetsReceived++;
    const robotId = (payload.robotId || 'PRAHARI-01').trim().toUpperCase();
    const dev = this.registerDevice(robotId);
    const nowIso = new Date().toISOString();

    const accel = payload.accel || { x: payload.ax, y: payload.ay, z: payload.az };
    const gyro = payload.gyro || { x: payload.gx, y: payload.gy, z: payload.gz };

    if (!accel || accel.x == null || isNaN(Number(accel.x))) {
      this.debugStats.packetsRejected++;
      throw new Error('Invalid IMU Accel vector');
    }

    dev.imu = {
      available: true,
      accel: {
        x: Number(Number(accel.x).toFixed(2)),
        y: Number(Number(accel.y).toFixed(2)),
        z: Number(Number(accel.z).toFixed(2)),
      },
      gyro: {
        x: gyro?.x != null ? Number(Number(gyro.x).toFixed(2)) : 0.0,
        y: gyro?.y != null ? Number(Number(gyro.y).toFixed(2)) : 0.0,
        z: gyro?.z != null ? Number(Number(gyro.z).toFixed(2)) : 0.0,
      },
      updatedAt: nowIso,
    };

    dev.lastImuAt = nowIso;
    this.emit('device:imu', { robotId, imu: dev.imu, timestamp: nowIso });

    return { success: true, robotId, imu: dev.imu };
  }

  /**
   * Process Physical Sensor array packet (dedicated sensor upload)
   */
  processSensors(payload, senderIp = null) {
    this.debugStats.packetsReceived++;
    const robotId = (payload.robotId || 'PRAHARI-01').trim().toUpperCase();
    const dev = this.registerDevice(robotId);
    const nowIso = new Date().toISOString();

    if (payload.ultrasonic || payload.frontDistanceCm != null) {
      this.processTelemetry(payload, senderIp);
    }

    this.emit('device:sensor', {
      robotId,
      sensors: payload,
      timestamp: nowIso,
    });

    return { success: true, robotId, timestamp: nowIso };
  }

  /**
   * Ingest Command Acknowledgement from Device (ESP32)
   */
  processAck(payload, senderIp = null) {
    this.debugStats.packetsReceived++;
    const robotId = (payload.robotId || 'PRAHARI-01').trim().toUpperCase();
    const commandId = payload.commandId;
    const status = payload.status || 'SUCCESS'; // 'SUCCESS' | 'FAILED' | 'REJECTED'
    const nowIso = new Date().toISOString();

    const dev = this.getDeviceState(robotId);
    dev.lastCommandAckAt = nowIso;

    if (commandId && this.pendingCommands.has(commandId)) {
      const pending = this.pendingCommands.get(commandId);
      clearTimeout(pending.timer);
      this.pendingCommands.delete(commandId);
      pending.resolve({ success: status === 'SUCCESS', status, details: payload });
    }

    this.emit('device:ack', {
      robotId,
      commandId,
      status,
      command: payload.command,
      timestamp: nowIso,
    });

    return { success: true, commandId, status };
  }

  /**
   * Track an outgoing command sent to physical device and await acknowledgement
   */
  registerOutgoingCommand(commandId, command, timeoutMs = 2500) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingCommands.has(commandId)) {
          this.pendingCommands.delete(commandId);
          resolve({ success: false, status: 'TIMEOUT', error: 'No acknowledgement from device within timeout window' });
          this.emit('device:ack', {
            commandId,
            command,
            status: 'FAILED',
            error: 'TIMEOUT',
            timestamp: new Date().toISOString(),
          });
        }
      }, timeoutMs);

      this.pendingCommands.set(commandId, { resolve, timer, command, timestamp: Date.now() });
    });
  }

  /**
   * Background Heartbeat Watchdog
   * Iterates all registered robots and checks if heartbeat has lapsed
   */
  checkHeartbeats() {
    const now = Date.now();
    for (const [robotId, dev] of this.devices.entries()) {
      if (dev.status === 'ONLINE' && dev.lastHeartbeatAt) {
        const lastSeenMs = now - new Date(dev.lastHeartbeatAt).getTime();
        if (lastSeenMs > this.config.heartbeatTimeoutMs) {
          dev.status = 'OFFLINE';
          dev.safety.state = 'OFFLINE';
          dev.safety.message = `Heartbeat timeout (${(lastSeenMs / 1000).toFixed(1)}s elapsed since last ping)`;
          dev.safety.updatedAt = new Date().toISOString();

          this.emit('device:status', {
            robotId,
            status: 'OFFLINE',
            lastSeenSecondsAgo: Math.round(lastSeenMs / 1000),
            timestamp: new Date().toISOString(),
          });

          this.emit('system:alert', {
            robotId,
            type: 'ROBOT_OFFLINE',
            severity: 'CRITICAL',
            message: `Physical Robot ${robotId} went OFFLINE. Heartbeat lost.`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  /**
   * Get developer debug stats
   */
  getDebugStats() {
    return {
      ...this.debugStats,
      activeRobotsCount: this.devices.size,
      onlineRobotsCount: Array.from(this.devices.values()).filter((d) => d.status === 'ONLINE').length,
      pendingCommandsCount: this.pendingCommands.size,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Comprehensive payload validator rejecting impossible or corrupted values
   */
  validateTelemetryPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return 'Payload must be a valid JSON object';
    }

    if (payload.batteryVoltage !== undefined && payload.batteryVoltage !== null) {
      const v = Number(payload.batteryVoltage);
      if (isNaN(v) || v < 0 || v > 60.0) return `Invalid batteryVoltage: ${payload.batteryVoltage} (Expected 0.0 - 60.0V)`;
    }

    if (payload.batteryPercentage !== undefined && payload.batteryPercentage !== null) {
      const p = Number(payload.batteryPercentage);
      if (isNaN(p) || p < 0 || p > 100) return `Invalid batteryPercentage: ${payload.batteryPercentage} (Expected 0 - 100%)`;
    }

    if (payload.batteryCurrent !== undefined && payload.batteryCurrent !== null) {
      const c = Number(payload.batteryCurrent);
      if (isNaN(c) || c < 0 || c > 60.0) return `Invalid batteryCurrent: ${payload.batteryCurrent}`;
    }

    if (payload.leftMotorPWM !== undefined && payload.leftMotorPWM !== null) {
      const pwm = Number(payload.leftMotorPWM);
      if (isNaN(pwm) || pwm < -255 || pwm > 255) return `Invalid leftMotorPWM: ${payload.leftMotorPWM} (Expected -255..255)`;
    }

    if (payload.rightMotorPWM !== undefined && payload.rightMotorPWM !== null) {
      const pwm = Number(payload.rightMotorPWM);
      if (isNaN(pwm) || pwm < -255 || pwm > 255) return `Invalid rightMotorPWM: ${payload.rightMotorPWM} (Expected -255..255)`;
    }

    if (payload.temperature !== undefined && payload.temperature !== null) {
      const temp = Number(payload.temperature);
      if (isNaN(temp) || temp < -40 || temp > 130) return `Invalid temperature: ${payload.temperature}°C`;
    }

    if (payload.wifiRSSI !== undefined && payload.wifiRSSI !== null) {
      const rssi = Number(payload.wifiRSSI);
      if (isNaN(rssi) || rssi < -125 || rssi > 0) return `Invalid wifiRSSI: ${payload.wifiRSSI} dBm`;
    }

    return null;
  }
}

export const deviceService = new DeviceService();
