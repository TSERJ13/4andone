import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
});

/**
 * Modern Presigned URL Workflow:
 * 1. Frontend sends fileName + fileType
 * 2. Backend generates a temporary 'Signed PUT URL'
 * 3. Frontend uploads binary directly to that URL
 * 4. This bypasses Next.js body limits and is much more robust for large files.
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

    // Generate a signed URL that expires in 60 minutes
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${safeFileName}`;

    console.log(`[R2-SIGN] Generated signed URL for: ${safeFileName}`);

    return NextResponse.json({ 
      uploadUrl: signedUrl, 
      publicUrl: publicUrl 
    });
  } catch (error: any) {
    console.error('[R2-SIGN] Failure:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate signed URL' 
    }, { status: 500 });
  }
}
