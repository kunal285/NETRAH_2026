import mongoose from 'mongoose';

const RobotSchema = new mongoose.Schema(
  {
    robotId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: 'PRAHARI-MK1',
    },
    name: {
      type: String,
      default: 'PRAHARI MK-1 Traffic Robot',
    },
    model: {
      type: String,
      default: 'MK-1-BIPED-CHASSIS',
    },
    hardwareVersion: {
      type: String,
      default: 'v1.4-BTS7960-DUAL',
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'ESTOP', 'WARNING', 'STANDBY'],
      default: 'ONLINE',
      index: true,
    },
    mode: {
      type: String,
      enum: ['WEB', 'RC', 'AUTO', 'DEMO'],
      default: 'WEB',
      index: true,
    },
    batteryPercentage: {
      type: Number,
      default: 98,
      min: 0,
      max: 100,
    },
    batteryVoltage: {
      type: Number,
      default: 38.4,
    },
    batteryCurrent: {
      type: Number,
      default: 2.1,
    },
    leftMotorCurrent: {
      type: Number,
      default: 1.05,
    },
    rightMotorCurrent: {
      type: Number,
      default: 1.05,
    },
    leftMotorPwm: {
      type: Number,
      default: 0,
    },
    rightMotorPwm: {
      type: Number,
      default: 0,
    },
    wifiSignal: {
      type: Number,
      default: -58,
    },
    commandLatency: {
      type: Number,
      default: 18,
    },
    temperature: {
      type: Number,
      default: 36.2,
    },
    emergencyStop: {
      type: Boolean,
      default: false,
      index: true,
    },
    emergencyReason: {
      type: String,
      default: null,
    },
    sensorStatus: {
      ultrasonicFront: { type: Boolean, default: true },
      ultrasonicRear: { type: Boolean, default: true },
      currentSensors: { type: Boolean, default: true },
      imu: { type: Boolean, default: true },
      gps: { type: Boolean, default: true },
    },
    cameraStatus: {
      type: String,
      enum: ['ACTIVE', 'STREAMING', 'DEGRADED', 'OFFLINE'],
      default: 'ACTIVE',
    },
    aiStatus: {
      type: String,
      enum: ['ACTIVE', 'PROCESSING', 'STANDBY', 'OFFLINE'],
      default: 'ACTIVE',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDemo: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

RobotSchema.index({ robotId: 1, lastSeen: -1 });

export const Robot = mongoose.models.Robot || mongoose.model('Robot', RobotSchema);
export default Robot;
