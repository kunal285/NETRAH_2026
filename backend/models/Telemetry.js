import mongoose from 'mongoose';

const TelemetrySchema = new mongoose.Schema(
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
    battery: {
      voltage: { type: Number, default: null },
      current: { type: Number, default: null },
      percentage: { type: Number, default: null },
      powerWatts: { type: Number, default: null },
      stateOfCharge: { type: String, default: 'DISCHARGING' },
    },
    motors: {
      left: {
        current: { type: Number, default: 0 },
        pwm: { type: Number, default: 0 },
        temp: { type: Number, default: 35 },
      },
      right: {
        current: { type: Number, default: 0 },
        pwm: { type: Number, default: 0 },
        temp: { type: Number, default: 35 },
      },
    },
    locomotion: {
      linearVelocity: { type: Number, default: 0 },
      angularVelocity: { type: Number, default: 0 },
      throttle: { type: Number, default: 0 },
      steer: { type: Number, default: 0 },
      mode: { type: String, default: 'WEB' },
    },
    environmental: {
      ambientTemp: { type: Number, default: 28 },
      controllerTemp: { type: Number, default: 36.2 },
      humidity: { type: Number, default: 45 },
    },
    radio: {
      wifiRssi: { type: Number, default: -58 },
      pingMs: { type: Number, default: 18 },
      packetLossRate: { type: Number, default: 0 },
    },
    safety: {
      eStopPressed: { type: Boolean, default: false },
      obstacleInterlock: { type: Boolean, default: false },
      hardwareOverride: { type: Boolean, default: false },
      minObstacleDistanceCm: { type: Number, default: 120 },
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

// Compound indexes for high performance querying of time-series graphs
TelemetrySchema.index({ robotId: 1, timestamp: -1 });
TelemetrySchema.index({ timestamp: -1 });

export const Telemetry = mongoose.models.Telemetry || mongoose.model('Telemetry', TelemetrySchema);
export default Telemetry;
