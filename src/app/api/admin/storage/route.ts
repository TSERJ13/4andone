import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, type ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/lib/admin-auth';

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

interface StorageCache {
  usedBytes: number;
  usedGb: number;
  totalGb: number;
  percent: number;
  freeGb: number;
  fileCount: number;
  timestamp: number;
}

let cachedData: StorageCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

  if (!forceRefresh && cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cachedData, {
      headers: { 'Cache-Control': 'no-store' }
    });
  }

  try {
    if (!R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({
        error: 'Storage credentials not configured',
        usedBytes: 0,
        usedGb: 0,
        totalGb: 10,
        percent: 0,
        freeGb: 10,
        fileCount: 0
      }, { status: 200 });
    }

    let totalBytes = 0;
    let fileCount = 0;
    let continuationToken: string | undefined = undefined;

    do {
      const res: ListObjectsV2CommandOutput = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME,
          ContinuationToken: continuationToken,
        })
      );

      const contents = res.Contents || [];
      for (const item of contents) {
        totalBytes += item.Size || 0;
        fileCount++;
      }

      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    const TOTAL_GB = Number(process.env.STORAGE_LIMIT_GB || 10);
    const usedGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(2));
    const percent = Math.min(100, Number(((usedGb / TOTAL_GB) * 100).toFixed(1)));
    const freeGb = Math.max(0, Number((TOTAL_GB - usedGb).toFixed(2)));

    cachedData = {
      usedBytes: totalBytes,
      usedGb,
      totalGb: TOTAL_GB,
      percent,
      freeGb,
      fileCount,
      timestamp: Date.now(),
    };

    return NextResponse.json(cachedData, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (err: any) {
    console.error('[STORAGE-API] Failed to calculate bucket size:', err);
    // If cache exists from earlier, fallback to it
    if (cachedData) {
      return NextResponse.json(cachedData, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({
      error: err.message || 'Failed to calculate storage size',
      usedBytes: 0,
      usedGb: 0,
      totalGb: 10,
      percent: 0,
      freeGb: 10,
      fileCount: 0
    }, { status: 500 });
  }
}
