import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const getS3Client = () => {
  const region = process.env.AWS_REGION || 'ap-south-1';
  return new S3Client({
    region,
    endpoint: process.env.IMAGE_STORAGE_ENDPOINT || `https://s3.${region}.amazonaws.com`,
    credentials: {
      accessKeyId: process.env.IMAGE_STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.IMAGE_STORAGE_SECRET_KEY,
    },
  });
};

const getBucketName = () => process.env.IMAGE_STORAGE_BUCKET;

export const s3Storage = {
  async upload(buffer, key, mimeType) {
    const bucketName = getBucketName();
    if (!bucketName) {
      throw new Error('S3_BUCKET_NOT_CONFIGURED');
    }
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    await getS3Client().send(command);
    return key;
  },

  async generatePresignedUrl(key, expiresSeconds = 900) { // 15 mins default
    const bucketName = getBucketName();
    if (!bucketName) {
      throw new Error('S3_BUCKET_NOT_CONFIGURED');
    }
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    return getSignedUrl(getS3Client(), command, { expiresIn: expiresSeconds });
  },

  async retrieve(key) {
    const bucketName = getBucketName();
    if (!bucketName) {
      throw new Error('S3_BUCKET_NOT_CONFIGURED');
    }
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const response = await getS3Client().send(command);
    return Buffer.from(await response.Body.transformToByteArray());
  },

  async delete(key) {
    const bucketName = getBucketName();
    if (!bucketName) {
      throw new Error('S3_BUCKET_NOT_CONFIGURED');
    }
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await getS3Client().send(command);
    return true;
  },

  async exists(key) {
    const bucketName = getBucketName();
    if (!bucketName) {
      throw new Error('S3_BUCKET_NOT_CONFIGURED');
    }
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    try {
      await getS3Client().send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  },
};
