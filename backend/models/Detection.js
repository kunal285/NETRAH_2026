import mongoose from 'mongoose';

const DetectionSchema = new mongoose.Schema(
  {
    detectionId: { type: String, unique: true, sparse: true, index: true },
    robotId: { type: String, required: true, default: 'PRAHARI-01', index: true },
    type: { type: String, required: true, index: true },
    vehicleClass: { type: String, default: null },
    trackId: { type: Number, default: null },
    result: { type: String, default: '' },
    confidence: { type: Number, min: 0, max: 1, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
    boundingBox: { type: [Number], default: undefined },
    cameraId: { type: String, default: 'MOBILE_PHONE_CAM_01' },
    cameraSource: { type: String, default: 'mobile' },
    location: { lat: Number, lng: Number, address: String },
    imageId: { type: String, default: null, index: true },
    imageKey: { type: String, default: null },
    imageUrl: { type: String, default: null },
    plateImageKey: { type: String, default: null },
    plateImageUrl: { type: String, default: null },
    faceImageKey: { type: String, default: null },
    faceImageUrl: { type: String, default: null },
    imageUploadStatus: { type: String, default: 'PENDING' },
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

