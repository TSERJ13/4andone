import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
 * GET: Generates a Signed URL for Playback/Streaming
 * Used by AudioProvider to bypass public access restrictions.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    // Generate a signed playback URL (valid for 1 hour)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (error: any) {
    // R2-GET-SIGN Failure
    return NextResponse.json({ error: 'Failed to sign playback URL' }, { status: 500 });
  }
}

/**
 * POST: Generates a Signed URL for Upload
 * Used by AddTrackModal for direct browser-to-cloud uploads.
 */
export async function POST(request: NextRequest) {
  try {
    const { fileName, fileType } = await request.json();
    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Sanitize filename
    const safeFileName = `${Date.now()}-${fileName.replace(/\s+/g, '-')}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: safeFileName,
      ContentType: fileType || 'audio/mpeg',
    });

    // Generate a signed upload URL (valid for 10 minutes)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    
    const R2_DOMAIN = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-c41b1121b311f676bdc114d143278d18.r2.dev';
    const publicUrl = `${R2_DOMAIN}/${safeFileName}`;

    // R2-POST-SIGN Success

    return NextResponse.json({ 
      uploadUrl: signedUrl, 
      publicUrl: publicUrl 
    });
  } catch (error: any) {
    // R2-POST-SIGN Failure
    return NextResponse.json({ 
      error: error.message || 'Failed to generate upload URL' 
    }, { status: 500 });
  }
}
