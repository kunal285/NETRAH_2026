import mongoose from 'mongoose';

const ControlSessionSchema = new mongoose.Schema(
  {
    robotId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    mode: { type: String, enum: ['RC', 'WEB', 'AUTO', 'DEMO'], required: true },
    startTime: { type: Date, default: Date.now, index: true },
    endTime: { type: Date, default: null },
    commandCount: { type: Number, default: 0 },
    emergencyStops: { type: Number, default: 0 },
    connectionType: { type: String, default: 'web' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ControlSessionSchema.index({ robotId: 1, startTime: -1 });

export const ControlSession = mongoose.models.ControlSession || mongoose.model('ControlSession', ControlSessionSchema);
export default ControlSession;
