import { isPublicMediaKey } from '@/lib/media-key';
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT!,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

/**
 * Public proxy for media files stored in R2 (like telegram photos, artwork).
 * Usage: /api/media/[key] -> streams file with proper Content-Type & cache headers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key: rawKey } = await params;
    if (!rawKey) {
      return new NextResponse('Key is required', { status: 400 });
    }

    const key = rawKey;
    if (!isPublicMediaKey(key)) return new NextResponse('Invalid media key', { status: 400 });

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return new NextResponse('Not found', { status: 404 });
    }

    const contentType = response.ContentType || 'image/jpeg';
    const stream = response.Body.transformToWebStream();

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...(response.ContentLength ? { 'Content-Length': String(response.ContentLength) } : {}),
      },
    });
  } catch (error: any) {
    console.error('[MEDIA_PROXY_ERROR]', error);
    return new NextResponse('File not found or inaccessible', { status: 404 });
  }
}
