import mongoose from 'mongoose';

const ambulanceEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    cameraId: { type: String, default: 'CAM-01' },
    trackId: { type: Number, default: null },
    lane: { type: String, default: 'Lane 2' },
    direction: { type: String, default: 'APPROACHING' },
    status: { type: String, enum: ['APPROACHING', 'HOLDING', 'CORRIDOR_ACTIVE', 'CLEARED'], default: 'APPROACHING', index: true },
    visualConfidence: { type: Number, default: 0.95 },
    sirenConfidence: { type: Number, default: 0.0 },
    combinedConfidence: { type: Number, default: 0.95 },
    distanceMeters: { type: Number, default: 20.0 },
    snapshotUrl: { type: String, default: null },
    corridorEngagedAt: { type: Date, default: null },
    clearedAt: { type: Date, default: null },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

export const AmbulanceEvent = mongoose.models.AmbulanceEvent || mongoose.model('AmbulanceEvent', ambulanceEventSchema);
