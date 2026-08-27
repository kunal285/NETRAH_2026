import mongoose from 'mongoose';

const pedestrianEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    cameraId: { type: String, default: 'CAM-01' },
    inCrosswalk: { type: Boolean, default: false },
    riskLevel: { type: String, enum: ['SAFE', 'CAUTION', 'VIOLATION / RISK'], default: 'SAFE', index: true },
    riskScore: { type: Number, default: 0.1 },
    wardenGesture: { type: String, default: null },
    gestureConfidence: { type: Number, default: null },
    pedestrianCount: { type: Number, default: 1 },
    approachingVehicles: { type: Number, default: 0 },
    snapshotUrl: { type: String, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export const PedestrianEvent = mongoose.models.PedestrianEvent || mongoose.model('PedestrianEvent', pedestrianEventSchema);
