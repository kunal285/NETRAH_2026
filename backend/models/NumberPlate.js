import mongoose from 'mongoose';

const NumberPlateSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
    confidence: { type: Number, min: 0, max: 1, default: null },
    vehicleType: { type: String, default: null },
    detectionId: { type: String, required: true, index: true },
    robotId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    location: { lat: Number, lng: Number, address: String },
    originalImageId: { type: String, default: null },
    croppedPlateImageId: { type: String, default: null },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NumberPlateSchema.index({ robotId: 1, timestamp: -1 });
NumberPlateSchema.index({ plateNumber: 1, timestamp: -1 });

export const NumberPlate = mongoose.models.NumberPlate || mongoose.model('NumberPlate', NumberPlateSchema);
export default NumberPlate;
