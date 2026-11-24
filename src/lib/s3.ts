import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";
import { isSuperAdminRole } from "@/lib/rbac";

const s3Client = new S3Client({
  region: env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID || "dummy",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY || "dummy",
  },
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "text/plain",
]);

export async function generatePresignedUploadUrl(
  fileName: string,
  mimeType: string,
  module: Module,
  userId?: string
) {
  if (
    process.env.NODE_ENV === "production" &&
    (!env.S3_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID === "dummy")
  ) {
    throw new Error("S3 configuration error: Production S3 storage credentials are not configured");
  }

  // Validate allowed MIME types (ERP-020)
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new Error(`File upload rejected: Unsupported or dangerous MIME type '${mimeType}'`);
  }

  // Sanitize filename and extract safe extension
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = cleanName.split(".").pop()?.toLowerCase() || "bin";
  const fileKey = `${module.toLowerCase()}/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME || "dummy-bucket",
    Key: fileKey,
    ContentType: mimeType,
  });

  // Presigned URL expires in 15 minutes (900 seconds)
  const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return { presignedUrl, fileKey };
}

/**
 * Generates an authorized, short-lived signed download URL for private object access (ERP-020)
 */
export async function getSignedDownloadUrl(
  fileKey: string,
  expiresInSeconds = 900
): Promise<string> {
  if (
    process.env.NODE_ENV === "production" &&
    (!env.S3_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID === "dummy")
  ) {
    throw new Error("S3 configuration error: Production S3 storage credentials are not configured");
  }

  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME || "dummy-bucket",
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function getPublicUrl(fileKey: string) {
  // Assuming the bucket is public-read or a CDN is in front.
  // Otherwise, you would generate a GET presigned URL.
  return `https://${env.S3_BUCKET_NAME || "dummy-bucket"}.s3.${env.S3_REGION || "us-east-1"}.amazonaws.com/${fileKey}`;
}

export async function deleteS3File(
  fileKey: string,
  requestingUserId?: string,
  userRole?: string,
  options: { isSystemRetention?: boolean } = {}
) {
  // Fail closed if production credentials are missing or dummy
  if (
    process.env.NODE_ENV === "production" &&
    (!env.S3_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID === "dummy")
  ) {
    throw new Error("S3 configuration error: Production S3 storage credentials are not configured");
  }

  // Require verified requestingUserId unless executed as system retention job (ERP-020)
  if (!options.isSystemRetention && !requestingUserId) {
    throw new Error("Unauthorized: File deletion requires verified requestingUserId unless executed as system retention");
  }

  // Validate ownership
  if (requestingUserId) {
    const fileAsset = await db.fileAsset.findUnique({ where: { fileKey } });
    if (fileAsset?.uploadedBy && fileAsset.uploadedBy !== requestingUserId && !isSuperAdminRole(userRole)) {
      throw new Error("Forbidden: You do not have permission to delete this file asset");
    }
  }

  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET_NAME || "dummy-bucket",
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
