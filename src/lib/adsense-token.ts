import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const R2_BUCKET = process.env.R2_BUCKET_NAME || '';
const R2_ENDPOINT = process.env.R2_ENDPOINT || '';
const R2_KEY = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY || '';

const S3_KEY_PATH = '_system/adsense-tokens.json';

function getS3Client() {
  if (!R2_ENDPOINT || !R2_KEY || !R2_SECRET) return null;
  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_KEY,
      secretAccessKey: R2_SECRET,
    },
  });
}

export async function saveAdSenseTokens(tokens: any): Promise<boolean> {
  // 1. Save to R2 for cloud persistence
  const s3 = getS3Client();
  if (s3 && R2_BUCKET) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: S3_KEY_PATH,
          Body: JSON.stringify(tokens, null, 2),
          ContentType: 'application/json',
        })
      );
    } catch (e) {
      console.error('Failed to save AdSense tokens to R2', e);
    }
  }

  // 2. Also save to local file for dev
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'adsense-tokens.json'), JSON.stringify(tokens, null, 2), 'utf8');
  } catch (e) {}

  return true;
}

export async function getAdSenseRefreshToken(): Promise<string | null> {
  // 1. Env variable
  if (process.env.GOOGLE_ADSENSE_REFRESH_TOKEN) {
    return process.env.GOOGLE_ADSENSE_REFRESH_TOKEN;
  }

  // 2. Local dev file
  try {
    const localPath = path.join(process.cwd(), 'data', 'adsense-tokens.json');
    if (fs.existsSync(localPath)) {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (data?.refresh_token) return data.refresh_token;
    }
  } catch (e) {}

  // 3. R2 cloud storage
  const s3 = getS3Client();
  if (s3 && R2_BUCKET) {
    try {
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: S3_KEY_PATH,
        })
      );
      if (res.Body) {
        const bodyStr = await res.Body.transformToString();
        const data = JSON.parse(bodyStr);
        if (data?.refresh_token) return data.refresh_token;
      }
    } catch (e) {
      // Not found or not set up yet
    }
  }

  return null;
}
