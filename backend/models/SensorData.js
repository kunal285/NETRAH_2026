import mongoose from 'mongoose';

const SensorDataSchema = new mongoose.Schema(
  {
    robotId: {
      type: String,
      required: true,
      index: true,
      default: 'PRAHARI-MK1',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    frontUltrasonicCm: {
      type: Number,
      default: null,
    },
    rearUltrasonicCm: {
      type: Number,
      default: null,
    },
    leftUltrasonicCm: {
      type: Number,
      default: null,
    },
    rightUltrasonicCm: {
      type: Number,
      default: null,
    },
    batteryVoltage: {
      type: Number,
      default: null,
    },
    leftMotorCurrent: {
      type: Number,
      default: null,
    },
    rightMotorCurrent: {
      type: Number,
      default: null,
    },
    imu: {
      roll: { type: Number, default: null },
      pitch: { type: Number, default: null },
      yaw: { type: Number, default: null },
      accelX: { type: Number, default: null },
      accelY: { type: Number, default: null },
      accelZ: { type: Number, default: null },
      gyroZ: { type: Number, default: null },
    },
    gps: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      altitude: { type: Number, default: null },
      speedKmh: { type: Number, default: null },
      satellites: { type: Number, default: null },
      fix: { type: Boolean, default: false },
    },
    cameraStatus: {
      type: String,
      default: 'ACTIVE',
    },
    isDemo: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

SensorDataSchema.index({ robotId: 1, timestamp: -1 });

export const SensorData = mongoose.models.SensorData || mongoose.model('SensorData', SensorDataSchema);
export default SensorData;
