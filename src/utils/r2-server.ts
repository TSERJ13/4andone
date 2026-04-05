"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function createPresignedUrl(fileName: string, contentType: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileName,
      ContentType: contentType,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
    return { url };
  } catch (error) {
    console.error("R2 Presigned URL Error:", error);
    return { error: "Failed to generate upload URL" };
  }
}
