import { Robot } from '../models/Robot.js';
import { Telemetry } from '../models/Telemetry.js';
import { SensorData } from '../models/SensorData.js';
import { Detection } from '../models/Detection.js';
import { NumberPlate } from '../models/NumberPlate.js';
import { FaceEvent } from '../models/FaceEvent.js';
import { Alert } from '../models/Alert.js';
import { SafetyEvent } from '../models/SafetyEvent.js';
import { SystemLog } from '../models/SystemLog.js';
import { ControlSession } from '../models/ControlSession.js';
import { db } from '../config/db.js';

const DEFAULT_ROBOT_ID = process.env.DEFAULT_ROBOT_ID || 'PRAHARI-MK1';
const telemetrySampleMs = () => Math.max(200, Number(process.env.TELEMETRY_SAMPLE_INTERVAL_MS || 1000));

class PersistenceService {
  constructor() {
    this.lastTelemetrySave = 0;
  }

  get enabled() { return db.getStatus().connected; }

  async saveRobotState(state, robotId = DEFAULT_ROBOT_ID, isDemo = true) {
    if (!this.enabled) return null;
    return Robot.findOneAndUpdate({ robotId }, {
      $set: {
        status: state.status || (state.safety?.emergencyStop ? 'ESTOP' : 'ONLINE'),
        mode: state.mode || 'DEMO',
        batteryPercentage: state.battery?.percentage ?? null,
        batteryVoltage: state.battery?.voltage ?? null,
        batteryCurrent: state.battery?.current ?? null,
        leftMotorCurrent: state.leftMotor?.current ?? null,
        rightMotorCurrent: state.rightMotor?.current ?? null,
        leftMotorPwm: state.leftMotor?.speed ?? null,
        rightMotorPwm: state.rightMotor?.speed ?? null,
        wifiSignal: state.radio?.wifiRssi ?? -58,
        commandLatency: state.radio?.pingMs ?? 18,
        temperature: state.battery?.temperature ?? state.temperature ?? null,
        emergencyStop: Boolean(state.safety?.emergencyStop),
        sensorStatus: { ultrasonicFront: Boolean(state.ultrasonic), currentSensors: true, imu: true, gps: null },
        cameraStatus: state.cameraStatus || 'ACTIVE',
        aiStatus: state.aiStatus || 'ACTIVE',
        lastSeen: new Date(),
        isDemo,
      },
      $setOnInsert: { robotId, name: 'PRAHARI MK-1 Traffic Robot' },
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }

  async saveTelemetry(packet, robotId = DEFAULT_ROBOT_ID, isDemo = true) {
    if (!this.enabled || Date.now() - this.lastTelemetrySave < telemetrySampleMs()) return null;
    this.lastTelemetrySave = Date.now();
    const timestamp = packet.timestamp ? new Date(packet.timestamp) : new Date();
    const telemetry = await Telemetry.create({ robotId, timestamp, isDemo, battery: {
      voltage: packet.batteryVoltage ?? null, current: packet.batteryCurrent ?? null, percentage: packet.batteryPercentage ?? null,
    }, motors: { left: { current: packet.leftMotorCurrent, pwm: packet.leftMotorSpeed, temp: packet.leftMotorTemp }, right: { current: packet.rightMotorCurrent, pwm: packet.rightMotorSpeed, temp: packet.rightMotorTemp } }, locomotion: { mode: packet.mode, throttle: packet.speedPWM }, environmental: { controllerTemp: packet.batteryTemp }, radio: { pingMs: packet.commandLatency }, safety: { eStopPressed: Boolean(packet.emergencyStop), minObstacleDistanceCm: packet.obstacleDistance == null ? null : packet.obstacleDistance * 100 } });
    await SensorData.create({ robotId, timestamp, isDemo, frontUltrasonicCm: packet.obstacleDistance == null ? null : packet.obstacleDistance * 100, batteryVoltage: packet.batteryVoltage ?? null, leftMotorCurrent: packet.leftMotorCurrent ?? null, rightMotorCurrent: packet.rightMotorCurrent ?? null, cameraStatus: 'ACTIVE' });
    return telemetry;
  }

  async saveDetection(input, robotId = DEFAULT_ROBOT_ID, isDemo = false) {
    if (!this.enabled) return null;
    const detectionId = input.detectionId || input.id;
    const type = input.type === 'anpr' ? 'number_plate' : input.type;
    const detection = await Detection.create({ detectionId, robotId, type, result: input.result, confidence: input.confidence, timestamp: input.timestamp, boundingBox: input.boundingBox || input.details?.bbox, cameraId: input.cameraId || input.camera, location: input.location, imageId: input.imageId, details: input.details, status: input.status, isDemo: input.isDemo ?? isDemo });
    if (type === 'number_plate' && input.details?.plateNumber) await NumberPlate.create({ plateNumber: input.details.plateNumber, confidence: input.confidence, vehicleType: input.details.vehicleType, detectionId: detection.detectionId || detection._id.toString(), robotId, timestamp: detection.timestamp, location: input.location, originalImageId: input.imageId, isDemo: input.isDemo ?? isDemo });
    if (type === 'face') await FaceEvent.create({ robotId, timestamp: detection.timestamp, label: input.details?.personLabel, confidence: input.confidence, cameraId: input.cameraId || input.camera, location: input.location, imageId: input.imageId, detectionId: detection.detectionId || detection._id.toString(), isDemo: input.isDemo ?? isDemo });
    return detection;
  }

  async saveSafetyEvent(evt, robotId = DEFAULT_ROBOT_ID, isDemo = true) {
    if (!this.enabled) return null;
    const severity = evt.level || evt.severity || 'info';
    const saved = await SafetyEvent.create({ eventId: evt.id, robotId, type: evt.type || 'safety', severity, title: evt.title || evt.message || 'Safety event', description: evt.description || evt.message, timestamp: evt.timestamp, isDemo });
    await Alert.create({ robotId, severity, message: evt.description || evt.message || evt.title, timestamp: saved.timestamp, type: evt.type || 'safety', isDemo });
    return saved;
  }

  async startControlSession(data = {}) {
    if (!this.enabled) return null;
    return ControlSession.create({ robotId: data.robotId || DEFAULT_ROBOT_ID, userId: data.userId || null, mode: data.mode || 'WEB', connectionType: data.connectionType || 'web', isDemo: Boolean(data.isDemo) });
  }

  async logSystem(message, level = 'info', context = {}) {
    if (!this.enabled) return null;
    return SystemLog.create({ message, level, context, robotId: context.robotId || DEFAULT_ROBOT_ID });
  }
}

export const persistenceService = new PersistenceService();
