import mongoose from 'mongoose';

const StoredImageSchema = new mongoose.Schema(
  {
    imageId: { type: String, required: true, unique: true, index: true },
    robotId: { type: String, required: true, index: true },
    cameraSource: { type: String, enum: ['device', 'robot', 'demo'], default: 'device', index: true },
    imageType: { type: String, enum: ['vehicle', 'ambulance', 'number plate', 'face', 'detection evidence', 'robot snapshot'], required: true },
    storageKey: { type: String, required: true },
    imageUrl: { type: String, required: true },
    mimeType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    fileSize: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    isDemo: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

StoredImageSchema.index({ robotId: 1, createdAt: -1 });

export const StoredImage = mongoose.models.StoredImage || mongoose.model('StoredImage', StoredImageSchema);
export default StoredImage;
