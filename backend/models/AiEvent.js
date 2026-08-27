import mongoose from 'mongoose';

const aiEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        'PLATE_DETECTED',
        'AMBULANCE_DETECTED',
        'VEHICLE_DETECTED',
        'PEDESTRIAN_DETECTED',
        'WARDEN_GESTURE',
        'CROSSWALK_RISK',
        'SIREN_DETECTED',
        'EMERGENCY_STARTED',
        'EMERGENCY_CLEARED',
        'TRAFFIC_DENSITY_UPDATE',
      ],
      index: true,
    },
    timestamp: { type: Date, default: Date.now, index: true },
    cameraId: { type: String, default: 'CAM-01', index: true },
    confidence: { type: Number, default: 0.9 },
    objectClass: { type: String, default: 'vehicle' },
    trackId: { type: Number, default: null },
    bbox: { type: [Number], default: [] },
    lane: { type: String, default: null },
    snapshotUrl: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDemo: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

aiEventSchema.index({ type: 1, timestamp: -1 });
aiEventSchema.index({ cameraId: 1, timestamp: -1 });

export const AiEvent = mongoose.models.AiEvent || mongoose.model('AiEvent', aiEventSchema);
