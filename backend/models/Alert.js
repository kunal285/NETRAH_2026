import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    robotId: { type: String, required: true, index: true },
    severity: { type: String, enum: ['info', 'warning', 'danger', 'critical'], required: true, index: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acknowledgedAt: { type: Date, default: null },
    type: { type: String, default: 'system' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

AlertSchema.index({ robotId: 1, timestamp: -1 });

export const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
export default Alert;
