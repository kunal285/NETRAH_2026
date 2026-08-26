import mongoose from 'mongoose';

const SafetyEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, unique: true, sparse: true, index: true },
    robotId: { type: String, required: true, index: true },
    type: { type: String, default: 'safety' },
    severity: { type: String, default: 'info', index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

SafetyEventSchema.index({ robotId: 1, timestamp: -1 });

export const SafetyEvent = mongoose.models.SafetyEvent || mongoose.model('SafetyEvent', SafetyEventSchema);
export default SafetyEvent;
