import mongoose from 'mongoose';

const StoredImageSchema = new mongoose.Schema(
  {
    imageId: { type: String, required: true, unique: true, index: true },
    robotId: { type: String, required: true, index: true },
    cameraSource: { type: String, default: 'device', index: true },
    imageType: { type: String, required: true },
    storageKey: { type: String, required: true },
    imageUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    isDemo: { type: Boolean, default: false, index: true },
    // S3 specific metadata from user request
    imageKey: { type: String, index: true },
    storage: { type: String, default: 's3' },
    bucket: { type: String },
    contentType: { type: String },
  },
  { timestamps: true }
);

StoredImageSchema.index({ robotId: 1, createdAt: -1 });

export const StoredImage = mongoose.models.StoredImage || mongoose.model('StoredImage', StoredImageSchema);
export default StoredImage;
