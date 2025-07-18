import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const PATH = 'image-to-video/paid_hosting';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export const getPutURL = async (): Promise<{ url: string; key: string, publicUrl: string }> => {
  if (!process.env.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET environment variable is not set');
  }

  const key = randomUUID().slice(0, 4);
  const bucket = process.env.AWS_S3_BUCKET;
  const fullKey = `${PATH}/${key}.mp4`; // Assuming we're dealing with MP4 files
  const publicUrl = `https://${bucket}.t3.storage.dev/${fullKey}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fullKey,
    ContentType: 'video/mp4',
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 120 }); // URL expires in 2 minutes
    console.log("SIGNED?", url)
    return { url, key: fullKey ,publicUrl};
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw new Error('Failed to generate pre-signed URL');
  }
};