import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

/**
 * S3Service
 * Handles reliable, secure image storage in AWS S3 for PRAHARI AI detections.
 * Enforces predictable key structure:
 * prahari/detections/YYYY/MM/DD/<robotId>/<detectionId>.jpg
 */
class S3Service {
  constructor() {
    this.client = null;
    this.bucketName = null;
    this.region = null;
    this.initialized = false;
    this.init();
  }

  init() {
    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID || process.env.IMAGE_STORAGE_ACCESS_KEY;
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY || process.env.IMAGE_STORAGE_SECRET_KEY;
    this.region =
      process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
    this.bucketName =
      process.env.AWS_S3_BUCKET_NAME ||
      process.env.IMAGE_STORAGE_BUCKET ||
      'prahari-image-storage-2026';
    const endpoint =
      process.env.AWS_ENDPOINT_URL || process.env.IMAGE_STORAGE_ENDPOINT;

    if (accessKeyId && secretAccessKey) {
      const config = {
        region: this.region,
        credentials: {
          accessKeyId: accessKeyId.trim(),
          secretAccessKey: secretAccessKey.trim(),
        },
      };

      if (endpoint && !endpoint.includes('amazonaws.com')) {
        config.endpoint = endpoint;
        config.forcePathStyle = true;
      }

      try {
        this.client = new S3Client(config);
        this.initialized = true;
        console.log(`[S3] Initialized client for bucket: ${this.bucketName} (Region: ${this.region})`);
      } catch (err) {
        console.error('[S3] Client initialization failed:', err.message);
        this.initialized = false;
      }
    } else {
      console.warn('[S3] AWS credentials not found in environment. S3 uploads will operate in fallback mode.');
      this.initialized = false;
    }
  }

  /**
   * Generates predictable S3 key for detection images:
   * prahari/detections/YYYY/MM/DD/<robotId>/<detectionId>.jpg
   */
  generateKey(detectionId, robotId = 'PRAHARI-01', subType = null) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const safeRobotId = (robotId || 'PRAHARI-01').replace(/[^a-zA-Z0-9-_]/g, '');
    const safeDetId = (detectionId || `det_${Date.now()}`).replace(/[^a-zA-Z0-9-_]/g, '');

    if (subType) {
      const safeSubType = subType.replace(/[^a-zA-Z0-9-_]/g, '');
      return `prahari/detections/${year}/${month}/${day}/${safeRobotId}/${safeDetId}/${safeSubType}.jpg`;
    }
    return `prahari/detections/${year}/${month}/${day}/${safeRobotId}/${safeDetId}.jpg`;
  }

  /**
   * Uploads detection image buffer to S3 with automatic retries (up to 3 attempts)
   */
  async uploadDetectionImage({
    imageBuffer,
    detectionId,
    robotId = 'PRAHARI-01',
    mimeType = 'image/jpeg',
    subType = null,
  }) {
    if (!imageBuffer || !(imageBuffer instanceof Buffer)) {
      throw new Error('uploadDetectionImage requires a valid Buffer');
    }

    const key = this.generateKey(detectionId, robotId, subType);

    if (!this.client || !this.initialized) {
      console.warn(`[S3] Upload skipped - S3 client not configured. Key: ${key}`);
      return {
        key,
        url: `/api/detections/${detectionId}/image`,
        uploadStatus: 'FAILED',
        error: 'S3_CLIENT_NOT_CONFIGURED',
      };
    }

    console.log(`[S3] Upload started | Bucket: ${this.bucketName} | Key: ${key} | Size: ${imageBuffer.length} bytes`);

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: imageBuffer,
          ContentType: mimeType,
          Metadata: {
            robotId: String(robotId),
            detectionId: String(detectionId),
            timestamp: new Date().toISOString(),
          },
        });

        await this.client.send(command);
        console.log(`[S3] Upload successful (Attempt ${attempt}) | Key: ${key}`);

        const url = await this.getDetectionImageUrl(key);
        return {
          key,
          url,
          bucket: this.bucketName,
          uploadStatus: 'UPLOADED',
        };
      } catch (err) {
        lastError = err;
        console.warn(`[S3] Upload attempt ${attempt}/${maxRetries} failed: ${err.message}`);
        if (attempt < maxRetries) {
          // Exponential backoff wait
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
        }
      }
    }

    console.error(`[S3] Upload FAILED after ${maxRetries} attempts | Bucket: ${this.bucketName} | Region: ${this.region} | Error: ${lastError?.message}`);
    return {
      key,
      url: null,
      uploadStatus: 'FAILED',
      error: lastError?.message || 'S3_UPLOAD_FAILED',
    };
  }

  /**
   * Generates a temporary signed URL for secure private S3 object retrieval
   */
  async getDetectionImageUrl(key, expiresInSeconds = 3600) {
    if (!key) return null;
    if (!this.client || !this.initialized) {
      return `/api/storage/image/${encodeURIComponent(key)}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const signedUrl = await getSignedUrl(this.client, command, {
        expiresIn: expiresInSeconds,
      });
      return signedUrl;
    } catch (err) {
      console.warn(`[S3] Failed to generate signed URL for key ${key}: ${err.message}`);
      return `/api/storage/image/${encodeURIComponent(key)}`;
    }
  }

  /**
   * Fetches image stream from S3 for backend proxying
   */
  async getObjectStream(key) {
    if (!this.client || !this.initialized) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return this.client.send(command);
  }

  /**
   * Deletes an individual S3 object
   */
  async deleteDetectionImage(key) {
    if (!key || !this.client || !this.initialized) return { success: false };

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
      console.log(`[S3] Deleted object: ${key}`);
      return { success: true, key };
    } catch (err) {
      console.error(`[S3] Delete failed for ${key}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Batch deletes S3 objects (e.g. on Clear Log)
   */
  async deleteDetectionImages(keys = []) {
    if (!keys || keys.length === 0 || !this.client || !this.initialized) {
      return { success: true, deletedCount: 0 };
    }

    const validKeys = keys.filter((k) => typeof k === 'string' && k.trim().length > 0);
    if (validKeys.length === 0) return { success: true, deletedCount: 0 };

    try {
      const objects = validKeys.map((k) => ({ Key: k }));
      const command = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: { Objects: objects, Quiet: true },
      });
      const response = await this.client.send(command);
      console.log(`[S3] Batch deleted ${validKeys.length} objects from S3`);
      return { success: true, deletedCount: validKeys.length, response };
    } catch (err) {
      console.error('[S3] Batch delete failed:', err.message);
      // Attempt individual deletes as fallback
      let deleted = 0;
      for (const key of validKeys) {
        try {
          await this.deleteDetectionImage(key);
          deleted++;
        } catch {
          // ignore single failure
        }
      }
      return { success: deleted > 0, deletedCount: deleted };
    }
  }

  /**
   * Safe S3 connectivity test
   */
  async testConnection() {
    if (!this.client || !this.initialized) {
      return {
        connected: false,
        status: 'OFFLINE',
        bucket: this.bucketName,
        region: this.region,
        error: 'AWS credentials not configured in environment',
      };
    }

    try {
      const command = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.client.send(command);
      return {
        connected: true,
        status: 'OK',
        bucket: this.bucketName,
        region: this.region,
      };
    } catch (err) {
      return {
        connected: false,
        status: 'ERROR',
        bucket: this.bucketName,
        region: this.region,
        error: err.message,
      };
    }
  }
}

export const s3Service = new S3Service();
