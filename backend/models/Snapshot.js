import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema(
  {
    snapshotId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    robotId: {
      type: String,
      required: true,
      default: 'PRAHARI-01',
      index: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imageUploadStatus: {
      type: String,
      enum: ['PENDING', 'UPLOADING', 'UPLOADED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    width: {
      type: Number,
      default: 1280,
    },
    height: {
      type: Number,
      default: 720,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'image/jpeg',
    },
    source: {
      type: String,
      default: 'MAST_CAMERA',
    },
    imageBase64: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Optimize query for newest snapshots first
snapshotSchema.index({ createdAt: -1 });

export const Snapshot = mongoose.models.Snapshot || mongoose.model('Snapshot', snapshotSchema);
