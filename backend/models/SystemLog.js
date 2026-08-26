import mongoose from 'mongoose';

const SystemLogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['info', 'warning', 'error', 'critical'], default: 'info', index: true },
    message: { type: String, required: true },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    robotId: { type: String, default: null, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

SystemLogSchema.index({ timestamp: -1 });

export const SystemLog = mongoose.models.SystemLog || mongoose.model('SystemLog', SystemLogSchema);
export default SystemLog;
