import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  GetBucketLocationCommand,
  _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { S3FileItem, FileCategory } from "@/types/file";
import { getFileCategory, sanitizeFileName, formatBytes } from "./utils";

export interface S3ConfigStatus {
  isValid: boolean;
  missingVariables: string[];
  bucketName: string;
  region: string;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  errorMessage?: string;
}

let resolvedRegion: string | null = null;
let cachedS3Client: S3Client | null = null;

/**
 * Validate AWS S3 configuration from environment variables safely.
 * Never exposes the actual keys.
 */
export function getS3ConfigStatus(): S3ConfigStatus {
  const region = process.env.AWS_REGION || "ap-south-1";
  const bucketName = process.env.AWS_S3_BUCKET_NAME || "tushardevx01";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

  const missing: string[] = [];
  if (!region.trim()) missing.push("AWS_REGION");
  if (!bucketName.trim()) missing.push("AWS_S3_BUCKET_NAME");
  if (!accessKeyId.trim()) missing.push("AWS_ACCESS_KEY_ID");
  if (!secretAccessKey.trim()) missing.push("AWS_SECRET_ACCESS_KEY");

  return {
    isValid: missing.length === 0,
    missingVariables: missing,
    bucketName,
    region,
    hasAccessKey: Boolean(accessKeyId.trim()),
    hasSecretKey: Boolean(secretAccessKey.trim()),
    errorMessage:
      missing.length > 0
        ? `Missing required AWS configuration: ${missing.join(", ")} in .env`
        : undefined,
  };
}

/**
 * Returns a configured S3Client instance.
 */
export function getS3Client(): S3Client {
  const status = getS3ConfigStatus();
  if (!status.isValid) {
    throw new Error(
      `S3 Client cannot initialize: ${status.missingVariables.join(", ")} missing in .env`
    );
  }

  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      region: resolvedRegion || status.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
      },
    });
  }

  return cachedS3Client;
}

/**
 * Resolves the actual AWS region of the bucket if a 301 PermanentRedirect occurs.
 */
async function autoResolveBucketRegion(bucketName: string): Promise<string> {
  try {
    const resolver = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
      },
    });
    const loc = await resolver.send(new GetBucketLocationCommand({ Bucket: bucketName }));
    const actual = loc.LocationConstraint || "us-east-1";
    resolvedRegion = actual;
    cachedS3Client = null; // force recreation with actual region
    return actual;
  } catch (err) {
    console.warn("Could not auto-resolve bucket region:", err);
    return resolvedRegion || process.env.AWS_REGION || "ap-southeast-2";
  }
}

/**
 * Wraps S3 operations with automatic region redirection handling
 */
async function executeWithAutoRegion<T>(operation: (client: S3Client) => Promise<T>): Promise<T> {
  const client = getS3Client();
  try {
    return await operation(client);
  } catch (error: unknown) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "PermanentRedirect" || err.$metadata?.httpStatusCode === 301) {
      const bucket = getBucketName();
      await autoResolveBucketRegion(bucket);
      const newClient = getS3Client();
      return await operation(newClient);
    }
    throw error;
  }
}

/**
 * Returns the configured bucket name.
 */
export function getBucketName(): string {
  return process.env.AWS_S3_BUCKET_NAME?.trim() || "tushardevx01";
}

/**
 * Generates a unique, collision-proof, path-safe S3 object key.
 */
export function generateObjectKey(originalFileName: string): {
  key: string;
  sanitizedName: string;
} {
  const sanitizedName = sanitizeFileName(originalFileName);
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString("hex");
  const key = `uploads/${timestamp}-${randomSuffix}-${sanitizedName}`;
  return { key, sanitizedName };
}

/**
 * Extract human readable original filename from S3 key or metadata
 */
export function extractOriginalName(key: string, metadataName?: string): string {
  if (metadataName && metadataName.trim().length > 0) {
    return metadataName.trim();
  }
  const cleaned = key.replace(/^uploads\//, "");
  const match = cleaned.match(/^\d+-[a-f0-9]+-(.+)$/);
  if (match && match[1]) {
    return match[1];
  }
  return cleaned;
}

/**
 * Verify S3 bucket access and credentials validity.
 */
export async function testS3Connectivity(): Promise<{
  connected: boolean;
  message: string;
  bucket: string;
  region: string;
}> {
  const status = getS3ConfigStatus();
  if (!status.isValid) {
    return {
      connected: false,
      message: `Incomplete credentials. Please provide ${status.missingVariables.join(", ")} in .env.`,
      bucket: status.bucketName,
      region: status.region,
    };
  }

  try {
    await executeWithAutoRegion(async (client) => {
      await client.send(new HeadBucketCommand({ Bucket: status.bucketName }));
    });

    return {
      connected: true,
      message: `Successfully connected to Amazon S3 bucket "${status.bucketName}" (${status.region}).`,
      bucket: status.bucketName,
      region: status.region,
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    let friendlyMessage = "Failed to connect to Amazon S3.";

    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      friendlyMessage = `Bucket "${status.bucketName}" was not found in region "${status.region}".`;
    } else if (err.name === "AccessDenied" || err.$metadata?.httpStatusCode === 403) {
      friendlyMessage = `Access Denied: The IAM credentials do not have permission to access bucket "${status.bucketName}".`;
    } else if (err.name === "InvalidAccessKeyId") {
      friendlyMessage = "AWS Access Key ID provided does not exist in our records.";
    } else if (err.name === "SignatureDoesNotMatch") {
      friendlyMessage = "AWS Secret Access Key is invalid or signature calculation failed.";
    } else if (err.message) {
      friendlyMessage = err.message;
    }

    return {
      connected: false,
      message: friendlyMessage,
      bucket: status.bucketName,
      region: status.region,
    };
  }
}

/**
 * List all files in the bucket with metadata.
 */
export async function listS3Files(): Promise<S3FileItem[]> {
  const bucket = getBucketName();

  const response = await executeWithAutoRegion(async (client) => {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: "uploads/",
    });
    return await client.send(command);
  });

  const contents: _Object[] = response.Contents || [];
  const items: S3FileItem[] = [];

  for (const obj of contents) {
    if (!obj.Key || obj.Key.endsWith("/")) continue;

    const originalName = extractOriginalName(obj.Key);
    const category = getFileCategory(originalName);

    items.push({
      key: obj.Key,
      originalName,
      size: obj.Size || 0,
      lastModified: obj.LastModified?.toISOString() || new Date().toISOString(),
      contentType: getMimeTypeFromFilename(originalName),
      category,
      eTag: obj.ETag?.replace(/"/g, ""),
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );

  return items;
}

/**
 * Upload a file directly to Amazon S3 with metadata.
 */
export async function uploadToS3(params: {
  buffer: Buffer;
  originalFileName: string;
  contentType: string;
  uploadedBy?: string;
}): Promise<S3FileItem> {
  const bucket = getBucketName();
  const { key } = generateObjectKey(params.originalFileName);
  const category = getFileCategory(params.originalFileName, params.contentType);
  const uploader = (params.uploadedBy || "Aditya").trim();

  await executeWithAutoRegion(async (client) => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType || "application/octet-stream",
      Metadata: {
        "original-name": encodeURIComponent(params.originalFileName),
        "category": category,
        "uploaded-by": encodeURIComponent(uploader),
        "uploaded-at": new Date().toISOString(),
      },
    });
    return await client.send(command);
  });

  return {
    key,
    originalName: params.originalFileName,
    size: params.buffer.length,
    lastModified: new Date().toISOString(),
    contentType: params.contentType,
    category,
    uploadedBy: uploader,
  };
}

/**
 * Generate a short-lived presigned URL for secure download or preview.
 */
export async function getPresignedFileUrl(
  key: string,
  disposition: "inline" | "attachment" = "attachment",
  originalFilename?: string,
  expiresInSeconds: number = 900 // 15 minutes default
): Promise<string> {
  const bucket = getBucketName();
  const filename = originalFilename || extractOriginalName(key);
  const contentDisposition =
    disposition === "attachment"
      ? `attachment; filename="${encodeURIComponent(filename)}"`
      : `inline; filename="${encodeURIComponent(filename)}"`;

  return await executeWithAutoRegion(async (client) => {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: contentDisposition,
    });
    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  });
}

/**
 * Fetch object stream from Amazon S3.
 */
export async function getS3ObjectStream(key: string) {
  const bucket = getBucketName();

  return await executeWithAutoRegion(async (client) => {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return await client.send(command);
  });
}

/**
 * Delete a file permanently from S3.
 */
export async function deleteS3File(key: string): Promise<boolean> {
  const bucket = getBucketName();

  await executeWithAutoRegion(async (client) => {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return await client.send(command);
  });

  return true;
}

/**
 * Helper to deduce MIME types
 */
function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    txt: "text/plain",
    json: "application/json",
    csv: "text/csv",
    zip: "application/zip",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };
  return map[ext || ""] || "application/octet-stream";
}
