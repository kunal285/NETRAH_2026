import mongoose from 'mongoose';

const FaceEventSchema = new mongoose.Schema(
  {
    robotId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    label: { type: String, default: null },
    confidence: { type: Number, min: 0, max: 1, default: null },
    cameraId: { type: String, default: null },
    location: { lat: Number, lng: Number, address: String },
    imageId: { type: String, default: null },
    detectionId: { type: String, default: null, index: true },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

FaceEventSchema.index({ robotId: 1, timestamp: -1 });

export const FaceEvent = mongoose.models.FaceEvent || mongoose.model('FaceEvent', FaceEventSchema);
export default FaceEvent;
