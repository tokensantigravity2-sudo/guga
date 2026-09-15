import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '9ae3a90cd6af26f61d9df5ddf1d2e2f7';
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 'b65c0da005121fbe2a7c0cb5f20309d7';
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '6285a59c9fd1d2ca74a5c8b430e4a499d753e1ba227ee1f7486e7058956e8f20';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'guga-archivos';
export const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-fd657523da254291a4abf81747876cf5.r2.dev').replace(/\/$/, '');
