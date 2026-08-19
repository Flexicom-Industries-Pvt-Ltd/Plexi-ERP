import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";

const s3Client = new S3Client({
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export async function generatePresignedUploadUrl(
  fileName: string,
  mimeType: string,
  module: Module,
  userId?: string
) {
  const extension = fileName.split(".").pop();
  const fileKey = `${module.toLowerCase()}/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: fileKey,
    ContentType: mimeType,
  });

  // Presigned URL expires in 15 minutes (900 seconds)
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  // Note: the client must upload to this URL, then call another endpoint 
  // (e.g., saveFileRecord) to actually record the `FileAsset` in the database.
  // Alternatively, we could record a pending FileAsset here.

  return { presignedUrl, fileKey };
}

export async function getPublicUrl(fileKey: string) {
  // Assuming the bucket is public-read or a CDN is in front.
  // Otherwise, you would generate a GET presigned URL.
  return `https://${env.S3_BUCKET_NAME}.s3.${env.S3_REGION}.amazonaws.com/${fileKey}`;
}

export async function deleteS3File(fileKey: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
}

export async function saveFileRecord({
  fileName,
  fileKey,
  mimeType,
  sizeBytes,
  module,
  uploadedBy,
}: {
  fileName: string;
  fileKey: string;
  mimeType: string;
  sizeBytes: number;
  module: Module;
  uploadedBy?: string;
}) {
  const publicUrl = await getPublicUrl(fileKey);

  const fileAsset = await db.fileAsset.create({
    data: {
      fileName,
      fileKey,
      mimeType,
      sizeBytes,
      module,
      url: publicUrl,
      uploadedBy,
    },
  });

  return fileAsset;
}
