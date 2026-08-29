import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const region = process.env.AWS_REGION || 'ap-south-1';
const bucketName = process.env.IMAGE_STORAGE_BUCKET;

const s3Client = new S3Client({
  region,
  endpoint: process.env.IMAGE_STORAGE_ENDPOINT || `https://s3.${region}.amazonaws.com`,
  credentials: {
    accessKeyId: process.env.IMAGE_STORAGE_ACCESS_KEY,
    secretAccessKey: process.env.IMAGE_STORAGE_SECRET_KEY,
  },
});

async function setupCors() {
  if (!bucketName) {
    console.error('IMAGE_STORAGE_BUCKET is not set in .env');
    process.exit(1);
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const corsRules = {
    CORSRules: [
      {
        AllowedHeaders: ['*'],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedOrigins: ['http://localhost:3000', appUrl],
        ExposeHeaders: [],
        MaxAgeSeconds: 3000,
      },
    ],
  };

  try {
    console.log(`Configuring S3 CORS for bucket: ${bucketName}...`);
    console.log(`Allowed Origins: http://localhost:3000, ${appUrl}`);
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsRules,
    });
    await s3Client.send(command);
    console.log('Successfully configured S3 CORS!');
  } catch (error) {
    console.error('Error setting up S3 CORS:', error.message);
  }
}

setupCors();
