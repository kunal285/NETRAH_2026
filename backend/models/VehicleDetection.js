import mongoose from 'mongoose';

const vehicleDetectionSchema = new mongoose.Schema(
  {
    detectionId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    cameraId: { type: String, default: 'CAM-01' },
    vehicleType: { type: String, required: true, enum: ['CAR', 'MOTORCYCLE', 'BUS', 'TRUCK', 'AMBULANCE', 'HEAVY', 'OTHER'], index: true },
    confidence: { type: Number, default: 0.9 },
    trackId: { type: Number, default: null },
    lane: { type: String, default: 'Lane 1' },
    speedEst: { type: Number, default: null },
    bbox: { type: [Number], default: [] },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

vehicleDetectionSchema.index({ timestamp: -1, vehicleType: 1 });

export const VehicleDetection = mongoose.models.VehicleDetection || mongoose.model('VehicleDetection', vehicleDetectionSchema);
