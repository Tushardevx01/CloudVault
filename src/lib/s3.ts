import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  GetBucketLocationCommand,
  _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { S3FileItem } from "@/types/file";
import {
  buildContentDisposition,
  getFileCategory,
  getFileExtension,
  sanitizeFileName,
} from "./utils";
import {
  DEFAULT_AWS_REGION,
  DEFAULT_BUCKET_NAME,
  PRESIGNED_URL_EXPIRY_SECONDS,
  S3_UPLOAD_PREFIX,
} from "./constants";

export interface S3ConfigStatus {
  isValid: boolean;
  missingVariables: string[];
  bucketName: string;
  region: string;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  errorMessage?: string;
}

export interface S3ObjectMeta {
  originalName?: string;
  uploadedBy?: string;
  category?: string;
  contentType?: string;
  uploadedAt?: string;
  eTag?: string;
}

declare global {
  var _s3ResolvedRegion: string | null | undefined;
  var _s3CachedClient: S3Client | null | undefined;
  var _s3CachedClientKey: string | undefined;
  var _s3RegionResolutionPromise: Promise<string> | null | undefined;
  var _s3RegionVerified: boolean | undefined;
}

function normalizeS3LocationConstraint(constraint?: string | null): string {
  if (!constraint) return "us-east-1";
  if (constraint === "EU") return "eu-west-1";
  return constraint;
}

function extractRegionFromS3Error(error: unknown): string | null {
  const err = error as {
    $response?: { headers?: Record<string, string | undefined> };
  };
  const headers = err.$response?.headers;
  if (!headers) return null;
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === "x-amz-bucket-region" && v?.trim()) {
      return v.trim();
    }
  }
  return null;
}

function isSafeInlinePreviewMime(mimeType: string): boolean {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  return normalized.startsWith("image/") || normalized === "application/pdf";
}

/**
 * Validate AWS S3 configuration from environment variables safely.
 * Never exposes the actual keys.
 */
export function getS3ConfigStatus(): S3ConfigStatus {
  const region = process.env.AWS_REGION?.trim() || DEFAULT_AWS_REGION;
  const bucketName =
    process.env.AWS_S3_BUCKET_NAME?.trim() || DEFAULT_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";

  const missing: string[] = [];
  if (!region) missing.push("AWS_REGION");
  if (!bucketName) missing.push("AWS_S3_BUCKET_NAME");
  if (!accessKeyId.trim()) missing.push("AWS_ACCESS_KEY_ID");
  if (!secretAccessKey.trim()) missing.push("AWS_SECRET_ACCESS_KEY");

  return {
    isValid: missing.length === 0,
    missingVariables: missing,
    bucketName,
    region: globalThis._s3ResolvedRegion || region,
    hasAccessKey: Boolean(accessKeyId.trim()),
    hasSecretKey: Boolean(secretAccessKey.trim()),
    errorMessage:
      missing.length > 0
        ? `Missing required AWS configuration: ${missing.join(", ")} in .env`
        : undefined,
  };
}

/**
 * Returns the currently effective AWS region (including auto-resolved overrides).
 */
export function getEffectiveRegion(): string {
  return (
    globalThis._s3ResolvedRegion ||
    process.env.AWS_REGION?.trim() ||
    DEFAULT_AWS_REGION
  );
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

  const effectiveRegion = getEffectiveRegion();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID!.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!.trim();
  const clientKey = `${effectiveRegion}:${accessKeyId}`;

  if (
    !globalThis._s3CachedClient ||
    globalThis._s3CachedClientKey !== clientKey
  ) {
    globalThis._s3CachedClient = new S3Client({
      region: effectiveRegion,
      credentials: { accessKeyId, secretAccessKey },
    });
    globalThis._s3CachedClientKey = clientKey;
  }

  return globalThis._s3CachedClient;
}

/**
 * Resolves the actual AWS region of the bucket if a 301 PermanentRedirect occurs.
 */
async function autoResolveBucketRegion(
  bucketName: string,
  hintRegion?: string | null
): Promise<string> {
  if (hintRegion) {
    globalThis._s3ResolvedRegion = hintRegion;
    globalThis._s3CachedClient = null;
    globalThis._s3RegionVerified = true;
    return hintRegion;
  }

  if (globalThis._s3RegionResolutionPromise) {
    return globalThis._s3RegionResolutionPromise;
  }

  globalThis._s3RegionResolutionPromise = (async () => {
    try {
      const resolver = new S3Client({
        region: "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
        },
      });
      const loc = await resolver.send(
        new GetBucketLocationCommand({ Bucket: bucketName })
      );
      const actual = normalizeS3LocationConstraint(loc.LocationConstraint);
      globalThis._s3ResolvedRegion = actual;
      globalThis._s3CachedClient = null;
      globalThis._s3RegionVerified = true;
      return actual;
    } catch (err) {
      const fallbackHint = extractRegionFromS3Error(err);
      if (fallbackHint) {
        globalThis._s3ResolvedRegion = fallbackHint;
        globalThis._s3CachedClient = null;
        globalThis._s3RegionVerified = true;
        return fallbackHint;
      }
      console.warn("Could not auto-resolve bucket region:", err);
      return getEffectiveRegion();
    } finally {
      globalThis._s3RegionResolutionPromise = null;
    }
  })();

  return globalThis._s3RegionResolutionPromise;
}

/**
 * Wraps S3 operations with automatic region redirection handling.
 */
async function executeWithAutoRegion<T>(
  operation: (client: S3Client) => Promise<T>
): Promise<T> {
  const client = getS3Client();
  try {
    const result = await operation(client);
    globalThis._s3RegionVerified = true;
    return result;
  } catch (error: unknown) {
    const err = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const headerRegion = extractRegionFromS3Error(error);
    const shouldRedirect =
      err.name === "PermanentRedirect" ||
      err.$metadata?.httpStatusCode === 301 ||
      (headerRegion !== null && headerRegion !== getEffectiveRegion());

    if (shouldRedirect) {
      await autoResolveBucketRegion(getBucketName(), headerRegion);
      const newClient = getS3Client();
      const retryResult = await operation(newClient);
      globalThis._s3RegionVerified = true;
      return retryResult;
    }
    throw error;
  }
}

/**
 * Ensures the active S3 bucket region has been validated via an S3 API call before signing URLs.
 */
async function ensureBucketRegionResolved(): Promise<void> {
  if (globalThis._s3RegionVerified) return;
  const bucket = getBucketName();
  try {
    await executeWithAutoRegion(async (client) => {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    });
  } catch (error: unknown) {
    const headerRegion = extractRegionFromS3Error(error);
    if (headerRegion && headerRegion !== getEffectiveRegion()) {
      await autoResolveBucketRegion(bucket, headerRegion);
    }
  }
}

/**
 * Returns the configured bucket name.
 */
export function getBucketName(): string {
  return process.env.AWS_S3_BUCKET_NAME?.trim() || DEFAULT_BUCKET_NAME;
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
  const key = `${S3_UPLOAD_PREFIX}${timestamp}-${randomSuffix}-${sanitizedName}`;
  return { key, sanitizedName };
}

/**
 * Extract human readable original filename from S3 key or metadata.
 */
export function extractOriginalName(
  key: string,
  metadataName?: string
): string {
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

function safeDecodeURIComponent(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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

    const effectiveRegion = getEffectiveRegion();
    return {
      connected: true,
      message: `Successfully connected to Amazon S3 bucket "${status.bucketName}" (${effectiveRegion}).`,
      bucket: status.bucketName,
      region: effectiveRegion,
    };
  } catch (error: unknown) {
    const err = error as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const effectiveRegion = getEffectiveRegion();
    let friendlyMessage = "Failed to connect to Amazon S3.";

    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      friendlyMessage = `Bucket "${status.bucketName}" was not found in region "${effectiveRegion}".`;
    } else if (
      err.name === "AccessDenied" ||
      err.$metadata?.httpStatusCode === 403
    ) {
      friendlyMessage = `Access Denied: The IAM credentials do not have permission to access bucket "${status.bucketName}".`;
    } else if (err.name === "InvalidAccessKeyId") {
      friendlyMessage =
        "AWS Access Key ID provided does not exist in our records.";
    } else if (err.name === "SignatureDoesNotMatch") {
      friendlyMessage =
        "AWS Secret Access Key is invalid or signature calculation failed.";
    } else if (err.message) {
      friendlyMessage = err.message;
    }

    return {
      connected: false,
      message: friendlyMessage,
      bucket: status.bucketName,
      region: effectiveRegion,
    };
  }
}

/**
 * List all files in the bucket with full ContinuationToken pagination.
 */
export async function listS3Files(): Promise<S3FileItem[]> {
  const bucket = getBucketName();
  const contents: _Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await executeWithAutoRegion(async (client) => {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: S3_UPLOAD_PREFIX,
        ContinuationToken: continuationToken,
      });
      return await client.send(command);
    });

    if (response.Contents) {
      contents.push(...response.Contents);
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  const items: S3FileItem[] = [];

  for (const obj of contents) {
    if (!obj.Key || obj.Key.endsWith("/")) continue;

    const originalName = extractOriginalName(obj.Key);
    const contentType = getMimeTypeFromFilename(originalName);
    const category = getFileCategory(originalName, contentType);

    items.push({
      key: obj.Key,
      originalName,
      size: obj.Size || 0,
      lastModified: obj.LastModified?.toISOString() || new Date().toISOString(),
      contentType,
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
 * Read user-defined S3 metadata for a specific object via HeadObject.
 */
export async function getS3ObjectMetadata(
  key: string
): Promise<S3ObjectMeta | null> {
  const bucket = getBucketName();
  try {
    const head = await executeWithAutoRegion(async (client) => {
      return await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key })
      );
    });
    const meta = head.Metadata || {};
    return {
      originalName: safeDecodeURIComponent(meta["original-name"]),
      uploadedBy: safeDecodeURIComponent(meta["uploaded-by"]),
      category: meta["category"],
      contentType: head.ContentType,
      uploadedAt: meta["uploaded-at"],
      eTag: head.ETag?.replace(/"/g, ""),
    };
  } catch {
    return null;
  }
}

/**
 * Upload a file directly to Amazon S3 with metadata.
 */
export async function uploadToS3(params: {
  buffer: Buffer;
  originalFileName: string;
  contentType: string;
  uploadedBy: string;
}): Promise<S3FileItem> {
  const bucket = getBucketName();
  const { key } = generateObjectKey(params.originalFileName);
  const resolvedContentType =
    params.contentType && params.contentType !== "application/octet-stream"
      ? params.contentType
      : getMimeTypeFromFilename(params.originalFileName);
  const category = getFileCategory(
    params.originalFileName,
    resolvedContentType
  );
  const uploader = params.uploadedBy.trim();
  const uploadedAt = new Date().toISOString();

  const putResult = await executeWithAutoRegion(async (client) => {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.buffer,
      ContentType: resolvedContentType,
      Metadata: {
        "original-name": encodeURIComponent(params.originalFileName),
        category,
        "uploaded-by": encodeURIComponent(uploader),
        "uploaded-at": uploadedAt,
      },
    });
    return await client.send(command);
  });

  return {
    key,
    originalName: params.originalFileName,
    size: params.buffer.length,
    lastModified: uploadedAt,
    contentType: resolvedContentType,
    category,
    eTag: putResult.ETag?.replace(/"/g, ""),
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
  expiresInSeconds: number = PRESIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  await ensureBucketRegionResolved();
  const bucket = getBucketName();
  const filename = originalFilename || extractOriginalName(key);
  const contentDisposition = buildContentDisposition(disposition, filename);
  const deducedMime =
    disposition === "inline" ? getMimeTypeFromFilename(filename) : undefined;
  const responseContentType =
    deducedMime && isSafeInlinePreviewMime(deducedMime)
      ? deducedMime
      : undefined;

  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: contentDisposition,
    ...(responseContentType ? { ResponseContentType: responseContentType } : {}),
  });
  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
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
 * Fetch up to `maxBytes` of a UTF-8 text/code object from S3 for safe inline preview.
 */
export async function getS3ObjectTextPreview(
  key: string,
  maxBytes: number = 512 * 1024
): Promise<{ content: string; truncated: boolean; totalSize?: number }> {
  const bucket = getBucketName();

  let response;
  try {
    response = await executeWithAutoRegion(async (client) => {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=0-${maxBytes - 1}`,
      });
      return await client.send(command);
    });
  } catch (error: unknown) {
    const err = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    if (err.name === "InvalidRange" || err.$metadata?.httpStatusCode === 416) {
      return { content: "", truncated: false, totalSize: 0 };
    }
    throw error;
  }

  const content = (await response.Body?.transformToString("utf-8")) || "";
  let totalSize: number | undefined;
  let truncated = false;

  if (response.ContentRange) {
    const match = response.ContentRange.match(/\/(\d+)$/);
    if (match && match[1]) {
      totalSize = Number(match[1]);
      truncated = totalSize > maxBytes;
    }
  } else if (typeof response.ContentLength === "number") {
    totalSize = response.ContentLength;
    truncated = response.ContentLength >= maxBytes;
  }

  return { content, truncated, totalSize };
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
 * Helper to deduce MIME types from filename extension.
 */
export function getMimeTypeFromFilename(filename: string): string {
  const ext = getFileExtension(filename);
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    bmp: "image/bmp",
    tiff: "image/tiff",
    avif: "image/avif",
    pdf: "application/pdf",
    txt: "text/plain; charset=utf-8",
    log: "text/plain; charset=utf-8",
    md: "text/markdown; charset=utf-8",
    csv: "text/csv; charset=utf-8",
    rtf: "application/rtf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    json: "application/json; charset=utf-8",
    xml: "application/xml; charset=utf-8",
    html: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    jsx: "text/javascript; charset=utf-8",
    ts: "text/typescript; charset=utf-8",
    tsx: "text/typescript; charset=utf-8",
    py: "text/x-python; charset=utf-8",
    java: "text/x-java-source; charset=utf-8",
    c: "text/x-c; charset=utf-8",
    cpp: "text/x-c++; charset=utf-8",
    go: "text/x-go; charset=utf-8",
    rs: "text/rust; charset=utf-8",
    sql: "application/sql; charset=utf-8",
    sh: "application/x-sh; charset=utf-8",
    yaml: "application/x-yaml; charset=utf-8",
    yml: "application/x-yaml; charset=utf-8",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    bz2: "application/x-bzip2",
    xz: "application/x-xz",
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    aac: "audio/aac",
    m4a: "audio/mp4",
  };
  return map[ext] || "application/octet-stream";
}
