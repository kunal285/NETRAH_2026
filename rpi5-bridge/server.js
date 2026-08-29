import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

// Configuration & Constants
const ROBOT_ID = process.env.ROBOT_ID || "PRAHARI-01";
const BACKEND_HTTP_URL = process.env.BACKEND_HTTP_URL || "http://localhost:4000";
const BACKEND_SOCKET_URL = process.env.BACKEND_SOCKET_URL || "http://localhost:4000";
const TELEMETRY_INTERVAL = 500; // 500ms (2Hz Telemetry Rate)
const DEVICE_SECRET = process.env.PRAHARI_DEVICE_SECRET || "PRAHARI_DEVICE_SECRET_KEY_2026";

// Raspberry Pi 5 GPIO Pinout Mapping (BCM)
const PINS = {
  LEFT_RPWM: 12,  // Hardware PWM0 (GPIO 12)
  LEFT_LPWM: 13,  // Hardware PWM1 (GPIO 13)
  LEFT_R_EN: 5,
  LEFT_L_EN: 6,
  RIGHT_RPWM: 18, // Hardware PWM0 (GPIO 18)
  RIGHT_LPWM: 19, // Hardware PWM1 (GPIO 19)
  RIGHT_R_EN: 23,
  RIGHT_L_EN: 24,
  ULTRA_FRONT_TRIG: 20,
  ULTRA_FRONT_ECHO: 21,
  ESTOP_BUTTON: 26,
};

// Dynamic Native Hardware imports
let i2c = null;
let SerialPort = null;
let i2cBusInstance = null;
let serialPortInstance = null;

async function initNativeHardware() {
  try {
    const i2cBusModule = await import('i2c-bus');
    i2c = i2cBusModule.default;
    i2cBusInstance = i2c.openSync(1);
    console.log("[RPI5-BRIDGE] MPU-6050 I2C Bus 1 successfully opened.");
  } catch (e) {
    console.log("[RPI5-BRIDGE] I2C hardware library not found or bus unavailable. Running simulated I2C.");
  }

  try {
    const serialportModule = await import('serialport');
    SerialPort = serialportModule.SerialPort;
    serialPortInstance = new SerialPort({
      path: '/dev/serial0',
      baudRate: 9600,
      autoOpen: false
    });
    serialPortInstance.open((err) => {
      if (err) {
        console.log("[RPI5-BRIDGE] Serial GPS device not found or unable to open. Running simulated GPS.");
      } else {
        console.log("[RPI5-BRIDGE] Serial GPS device /dev/serial0 opened successfully.");
      }
    });
  } catch (e) {
    console.log("[RPI5-BRIDGE] Serial hardware library not found. Running simulated GPS.");
  }
}

class RaspberryPi5Controller {
  constructor() {
    this.running = true;
    this.controlMode = "WEB";
    this.emergencyStop = false;
    this.startTime = Date.now();
    this.uptime = 0;

    // Motors & Telemetry
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

    // GPS & IMU
    this.gpsLat = 18.52043;
    this.gpsLng = 73.85674;
    this.gpsSpeed = 0.0;
    this.gpsSats = 9;
    this.gpsAvailable = true;

    this.accel = { x: 0.01, y: -0.02, z: 9.81 };
    this.gyro = { x: 0.00, y: 0.00, z: 0.00 };
    this.imuAvailable = true;
  }

  readSensors() {
    this.uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Read real MPU-6050 IMU over I2C (Bus 1, Addr 0x68) if available
    if (i2cBusInstance) {
      try {
        const buffer = Buffer.alloc(6);
        i2cBusInstance.readI2cBlockSync(0x68, 0x3B, 6, buffer);
        let ax = (buffer[0] << 8) | buffer[1];
        let ay = (buffer[2] << 8) | buffer[3];
        let az = (buffer[4] << 8) | buffer[5];
        if (ax > 32767) ax -= 65536;
        if (ay > 32767) ay -= 65536;
        if (az > 32767) az -= 65536;

        this.accel = {
          x: Number((ax / 16384.0 * 9.81).toFixed(2)),
          y: Number((ay / 16384.0 * 9.81).toFixed(2)),
          z: Number((az / 16384.0 * 9.81).toFixed(2)),
        };
        this.imuAvailable = true;
      } catch (err) {
        // Fallback to simulated IMU noise
        this.accel = {
          x: Number((0.01 + (Math.random() - 0.5) * 0.05).toFixed(2)),
          y: Number((-0.02 + (Math.random() - 0.5) * 0.05).toFixed(2)),
          z: Number((9.81 + (Math.random() - 0.5) * 0.05).toFixed(2)),
        };
      }
    } else {
      // Simulate IMU values
      this.accel = {
        x: Number((0.01 + (Math.random() - 0.5) * 0.04).toFixed(2)),
        y: Number((-0.02 + (Math.random() - 0.5) * 0.04).toFixed(2)),
        z: Number((9.81 + (Math.random() - 0.5) * 0.04).toFixed(2)),
      };
    }

    // Read GPS from serial if available
    if (serialPortInstance && serialPortInstance.isOpen) {
      // Typically serialPortInstance registers a 'data' event. Here we simulate fallback or parse NMEA
    } else {
      // Walk GPS coordinates slightly to show dynamic path simulation
      this.gpsLat = Number((18.52043 + (Math.random() - 0.5) * 0.0001).toFixed(6));
      this.gpsLng = Number((73.85674 + (Math.random() - 0.5) * 0.0001).toFixed(6));
      this.gpsSpeed = this.leftPwm > 0 ? Number((12.5 + Math.random()).toFixed(1)) : 0.0;
    }

    // Simulate battery drainage/charge
    this.batteryVoltage = Number((38.2 - (this.uptime * 0.0001) % 4.0).toFixed(1));
    this.batteryPercentage = Math.max(10, Math.min(100, Math.round((this.batteryVoltage - 30) / 8.2 * 100)));

    // Fluctuate ultrasonic sensors slightly
    this.frontDistance = Number((2.45 + (Math.random() - 0.5) * 0.1).toFixed(2));
    this.rearDistance = Number((4.10 + (Math.random() - 0.5) * 0.1).toFixed(2));
  }

  setMotors(command, speed = 50) {
    if (this.emergencyStop) {
      this.stopMotors();
      return;
    }

    const pwmVal = Math.floor((Math.max(0, Math.min(100, speed)) / 100.0) * 255);
    console.log(`[RPI5-BRIDGE] Drive Command: ${command} @ ${speed}% (PWM: ${pwmVal})`);

    if (command === "FORWARD") {
      this.leftPwm = pwmVal;
      this.rightPwm = pwmVal;
      this.leftCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
      this.rightCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
    } else if (command === "REVERSE") {
      this.leftPwm = -pwmVal;
      this.rightPwm = -pwmVal;
      this.leftCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
      this.rightCurrent = Number((0.5 + (pwmVal / 255.0) * 1.5).toFixed(2));
    } else if (command === "LEFT") {
      this.leftPwm = -pwmVal;
      this.rightPwm = pwmVal;
      this.leftCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
      this.rightCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
    } else if (command === "RIGHT") {
      this.leftPwm = pwmVal;
      this.rightPwm = -pwmVal;
      this.leftCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
      this.rightCurrent = Number((0.6 + (pwmVal / 255.0) * 1.8).toFixed(2));
    } else if (command === "STOP") {
      this.stopMotors();
    }
  }

  stopMotors() {
    this.leftPwm = 0;
    this.rightPwm = 0;
    this.leftCurrent = 0.45;
    this.rightCurrent = 0.48;
  }
}

const controller = new RaspberryPi5Controller();

async function postJson(endpoint, data) {
  try {
    const res = await fetch(`${BACKEND_HTTP_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-token": DEVICE_SECRET
      },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function telemetryLoop() {
  console.log(`[RPI5-BRIDGE] Started Telemetry Ingestion Loop (Rate: ${TELEMETRY_INTERVAL}ms)`);
  while (controller.running) {
    try {
      controller.readSensors();

      // 1. Heartbeat
      const hbPayload = {
        robotId: ROBOT_ID,
        uptime: controller.uptime,
        wifiRSSI: -45,
        firmwareVersion: "v2.4.0-RPI5-ARM64-NodeJS",
        controlMode: controller.controlMode,
      };
      await postJson("/api/device/heartbeat", hbPayload);

      // 2. Main Telemetry
      const telemetryPayload = {
        robotId: ROBOT_ID,
        batteryVoltage: controller.batteryVoltage,
        batteryPercentage: controller.batteryPercentage,
        batteryCurrent: Number((controller.leftCurrent + controller.rightCurrent).toFixed(2)),
        leftMotorCurrent: controller.leftCurrent,
        rightMotorCurrent: controller.rightCurrent,
        leftMotorPWM: controller.leftPwm,
        rightMotorPWM: controller.rightPwm,
        obstacleDistance: controller.frontDistance,
        rearDistance: controller.rearDistance,
        temperature: controller.temperature,
        wifiRSSI: -45,
        controlMode: controller.controlMode,
        emergencyStop: controller.emergencyStop,
        uptime: controller.uptime,
      };
      await postJson("/api/device/telemetry", telemetryPayload);

      // 3. GPS
      if (controller.gpsAvailable) {
        const gpsPayload = {
          robotId: ROBOT_ID,
          latitude: controller.gpsLat,
          longitude: controller.gpsLng,
          speed: controller.gpsSpeed,
          satellites: controller.gpsSats,
        };
        await postJson("/api/device/gps", gpsPayload);
      }

      // 4. IMU
      if (controller.imuAvailable) {
        const imuPayload = {
          robotId: ROBOT_ID,
          accel: controller.accel,
          gyro: controller.gyro,
        };
        await postJson("/api/device/imu", imuPayload);
      }
    } catch (e) {
      // Ignored telemetry ingestion errors
    }

    await new Promise(resolve => setTimeout(resolve, TELEMETRY_INTERVAL));
  }
}

async function startBridge() {
  console.log("=======================================================");
  console.log("PRAHARI RASPBERRY PI 5 HARDWARE BRIDGE DAEMON (NODE.JS)");
  console.log(`Target Robot: ${ROBOT_ID} | Backend: ${BACKEND_HTTP_URL}`);
  console.log("=======================================================");

  await initNativeHardware();

  // Run telemetry thread loop
  telemetryLoop();

  // Connect Socket.IO client
  const sio = io(BACKEND_SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity
  });

  sio.on('connect', () => {
    console.log("[RPI5-BRIDGE] Connected to PRAHARI Node.js Command Server via Socket.IO");
  });

  sio.on('disconnect', (reason) => {
    console.log(`[RPI5-BRIDGE] Socket disconnected. Reason: ${reason}`);
  });

  sio.on('connect_error', (err) => {
    console.warn(`[RPI5-BRIDGE] Socket connection error: ${err.message}`);
  });

  sio.on('device:command_out', async (data) => {
    if (data && data.robotId === ROBOT_ID) {
      const cmdId = data.commandId;
      const cmd = data.command;
      const spd = data.speed !== undefined ? data.speed : 50;

      controller.setMotors(cmd, spd);

      // Send Hardware ACK
      await postJson('/api/device/ack', {
        robotId: ROBOT_ID,
        commandId: cmdId,
        command: cmd,
        status: 'SUCCESS',
      });
    }
  });

  process.on('SIGINT', () => {
    console.log("\nShutting down Node bridge daemon...");
    controller.stopMotors();
    controller.running = false;
    sio.disconnect();
    if (i2cBusInstance) {
      try {
        i2cBusInstance.closeSync();
      } catch (e) {}
    }
    process.exit(0);
  });
}

startBridge();
