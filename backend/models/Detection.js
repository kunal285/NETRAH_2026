import mongoose from 'mongoose';

const DetectionSchema = new mongoose.Schema(
  {
    detectionId: { type: String, unique: true, sparse: true, index: true },
    robotId: { type: String, required: true, index: true },
    type: { type: String, enum: ['vehicle', 'ambulance', 'number_plate', 'anpr', 'face', 'obstacle'], required: true, index: true },
    result: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
    boundingBox: { type: [Number], default: undefined },
    cameraId: { type: String, default: null },
    location: { lat: Number, lng: Number, address: String },
    imageId: { type: String, default: null, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: 'VERIFIED' },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

DetectionSchema.index({ robotId: 1, timestamp: -1 });
DetectionSchema.index({ type: 1, timestamp: -1 });

export const Detection = mongoose.models.Detection || mongoose.model('Detection', DetectionSchema);
export default Detection;
