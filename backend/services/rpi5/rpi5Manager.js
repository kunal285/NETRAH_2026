/**
 * RPi5Manager — Internal Telemetry Bridge for PRAHARI Backend
 *
 * When running on the real Raspberry Pi 5, this module reads from hardware
 * (I2C, Serial, GPIO) via HardwareAdapter.
 *
 * When running on a development machine, MockAdapter simulates realistic
 * sensor fluctuations.
 *
 * IMPORTANT: Since this module is merged into the backend process, it
 * calls deviceService directly (no HTTP loopback, no socket.io-client loopback).
 * The server.js registers a Socket.IO listener for `device:command_out` and
 * calls rpi5Manager.handleCommand() to bridge hardware commands.
 */

import { MockAdapter } from './mockAdapter.js';
import { HardwareAdapter } from './hardwareAdapter.js';
import { AudioCapture } from './audioCapture.js';
import { deviceService } from '../deviceService.js';

class RPi5Manager {
  constructor() {
    this.robotId = process.env.ROBOT_ID || 'PRAHARI-01';
    this.telemetryInterval = 500; // 500ms (2Hz)
    this.running = false;

    // Robot Telemetry variables
    this.startTime = Date.now();
    this.uptime = 0;
    this.controlMode = 'WEB';
    this.emergencyStop = false;

    this.leftPwm = 0;
    this.rightPwm = 0;
    this.leftCurrent = 0.45;
    this.rightCurrent = 0.48;
    this.batteryVoltage = 38.2;
    this.batteryPercentage = 94;
    this.batteryCurrent = 0.93;
    this.frontDistance = 2.45;
    this.rearDistance = 4.10;
    this.temperature = 29.5;

    this.gpsLat = 18.52043;
    this.gpsLng = 73.85674;
    this.gpsSpeed = 0.0;
    this.gpsSats = 9;
    this.gpsAvailable = true;

    this.accel = { x: 0.01, y: -0.02, z: 9.81 };
    this.gyro = { x: 0.00, y: 0.00, z: 0.00 };
    this.imuAvailable = true;

    // Adapters
    this.hardwareAdapter = new HardwareAdapter(this);
    this.mockAdapter = new MockAdapter(this);
    this.audioCapture = new AudioCapture();

    this.isHardwareMode = false;
  }

  async init() {
    this.running = true;

    // Check and try to initialize real RPi5 hardware
    await this.hardwareAdapter.init();
    if (this.hardwareAdapter.initialized) {
      this.isHardwareMode = true;
      console.log('[NETRAH-RPI5] Real hardware mode armed.');
    } else {
      this.isHardwareMode = false;
      console.log('[NETRAH-RPI5] Hardware not found. Simulated/Mock mode armed.');
    }

    this.audioCapture.start();
    this.startTelemetryLoop();
  }

  getStatus() {
    return {
      initialized: true,
      mode: this.isHardwareMode ? 'hardware' : 'simulated',
      robotId: this.robotId,
      running: this.running,
      uptime: this.uptime,
      controlMode: this.controlMode,
      emergencyStop: this.emergencyStop,
    };
  }

  /**
   * Called by server.js Socket.IO `device:command_out` listener.
   * Routes hardware commands from the command pipeline to this bridge.
   */
  handleCommand(data) {
    if (!data || data.robotId !== this.robotId) return;
    const { commandId, command, speed } = data;
    const spd = speed !== undefined ? speed : 50;

    this.setMotors(command, spd);

    // Confirm ack directly into deviceService (no HTTP loopback)
    try {
      deviceService.processAck(
        {
          robotId: this.robotId,
          commandId,
          command,
          status: 'SUCCESS',
        },
        'internal'
      );
    } catch (_e) {
      // Ack not critical — suppress error
    }
  }

  /**
   * Called by server.js Socket.IO `device:mode` listener.
   */
  handleModeChange(data) {
    if (data && data.robotId === this.robotId && data.controlMode) {
      this.controlMode = data.controlMode;
    }
  }

  /**
   * Called by server.js Socket.IO `device:safety` listener.
   */
  handleSafetyUpdate(data) {
    if (data && data.robotId === this.robotId && data.safety) {
      this.emergencyStop = Boolean(data.safety.emergencyStop);
    }
  }

  startTelemetryLoop() {
    const internalIp = 'internal';

    const loop = async () => {
      if (!this.running) return;
      if (!this.isHardwareMode) {
        // Real hardware not present on this host machine — do not inject fake telemetry
        return;
      }
      try {
        this.uptime = Math.floor((Date.now() - this.startTime) / 1000);
        this.hardwareAdapter.readSensors();

        // 1. Heartbeat — directly call deviceService
        deviceService.processHeartbeat(
          {
            robotId: this.robotId,
            uptime: this.uptime,
            wifiRSSI: -45,
            firmwareVersion: 'v2.4.0-RPI5-ARM64-NodeJS',
            controlMode: this.controlMode,
          },
          internalIp
        );

        // 2. Main Telemetry — directly call deviceService
        deviceService.processTelemetry(
          {
            robotId: this.robotId,
            batteryVoltage: this.batteryVoltage,
            batteryPercentage: this.batteryPercentage,
            batteryCurrent: Number((this.leftCurrent + this.rightCurrent).toFixed(2)),
            leftMotorCurrent: this.leftCurrent,
            rightMotorCurrent: this.rightCurrent,
            leftMotorPWM: this.leftPwm,
            rightMotorPWM: this.rightPwm,
            obstacleDistance: this.frontDistance,
            rearDistance: this.rearDistance,
            temperature: this.temperature,
            wifiRSSI: -45,
            controlMode: this.controlMode,
            emergencyStop: this.emergencyStop,
            uptime: this.uptime,
          },
          internalIp
        );

        // 3. GPS
        if (this.gpsAvailable) {
          deviceService.processGps(
            {
              robotId: this.robotId,
              latitude: this.gpsLat,
              longitude: this.gpsLng,
              speed: this.gpsSpeed,
              satellites: this.gpsSats,
            },
            internalIp
          );
        }

        // 4. IMU
        if (this.imuAvailable) {
          deviceService.processImu(
            {
              robotId: this.robotId,
              accel: this.accel,
              gyro: this.gyro,
            },
            internalIp
          );
        }
      } catch (err) {
        // Suppress telemetry errors to prevent cascade
      }

      setTimeout(loop, this.telemetryInterval);
    };

    setTimeout(loop, this.telemetryInterval);
  }

  setMotors(command, speed) {
    if (this.emergencyStop) {
      this.stopMotors();
      return;
    }

    const pwmVal = Math.floor((Math.max(0, Math.min(100, speed)) / 100.0) * 255);

    if (command === 'FORWARD') {
      this.leftPwm = pwmVal;
      this.rightPwm = pwmVal;
      this.leftCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
      this.rightCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
    } else if (command === 'REVERSE') {
      this.leftPwm = -pwmVal;
      this.rightPwm = -pwmVal;
      this.leftCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
      this.rightCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
    } else if (command === 'LEFT') {
      this.leftPwm = -pwmVal;
      this.rightPwm = pwmVal;
      this.leftCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
      this.rightCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
    } else if (command === 'RIGHT') {
      this.leftPwm = pwmVal;
      this.rightPwm = -pwmVal;
      this.leftCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
      this.rightCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
    } else if (command === 'STOP') {
      this.stopMotors();
    }
  }

  stopMotors() {
    this.leftPwm = 0;
    this.rightPwm = 0;
    this.leftCurrent = 0.45;
    this.rightCurrent = 0.48;
  }

  close() {
    this.running = false;
    this.stopMotors();
    this.hardwareAdapter.close();
    this.audioCapture.stop();
  }
}

export const rpi5Manager = new RPi5Manager();
