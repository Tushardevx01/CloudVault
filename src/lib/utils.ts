import { FileCategory } from "@/types/file";

const TEXT_DOCUMENT_EXTENSIONS = new Set(["txt", "md", "csv", "log"]);

/**
 * Extracts lowercase extension without leading dot, returning "" for extensionless files or dotfiles.
 */
export function getFileExtension(filename: string): string {
  const baseName = filename.replace(/^.*[\\/]/, "");
  const lastDot = baseName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === baseName.length - 1) {
    return "";
  }
  return baseName.slice(lastDot + 1).toLowerCase();
}

/**
 * Format bytes into human readable format (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Detect file category based on extension or mime type
 */
export function getFileCategory(
  filename: string,
  mimeType?: string
): FileCategory {
  const extension = getFileExtension(filename);

  if (
    mimeType?.startsWith("image/") ||
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "ico",
      "tiff",
      "avif",
    ].includes(extension)
  ) {
    return "image";
  }

  if (
    mimeType?.includes("pdf") ||
    mimeType?.includes("word") ||
    mimeType?.includes("document") ||
    mimeType?.includes("sheet") ||
    mimeType?.includes("presentation") ||
    mimeType?.includes("text/plain") ||
    [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "rtf",
      "csv",
      "md",
      "log",
    ].includes(extension)
  ) {
    return "document";
  }

  if (
    mimeType?.startsWith("video/") ||
    mimeType?.startsWith("audio/") ||
    [
      "mp4",
      "webm",
      "mkv",
      "avi",
      "mov",
      "mp3",
      "wav",
      "ogg",
      "flac",
      "aac",
      "m4a",
    ].includes(extension)
  ) {
    return "media";
  }

  if (
    mimeType?.includes("zip") ||
    mimeType?.includes("compressed") ||
    mimeType?.includes("tar") ||
    ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(extension)
  ) {
    return "archive";
  }

  if (
    [
      "json",
      "xml",
      "html",
      "css",
      "js",
      "ts",
      "jsx",
      "tsx",
      "py",
      "java",
      "c",
      "cpp",
      "go",
      "rs",
      "sql",
      "sh",
      "yaml",
      "yml",
    ].includes(extension)
  ) {
    return "code";
  }

  return "other";
}

/**
 * Determines whether a file supports inline browser preview.
 */
export function isTextPreviewFile(
  filename: string,
  category: FileCategory
): boolean {
  if (category === "code") return true;
  const ext = getFileExtension(filename);
  return TEXT_DOCUMENT_EXTENSIONS.has(ext);
}

/**
 * Determines whether a file supports inline preview (image, PDF, code, or plain text).
 */
export function isFilePreviewable(
  filename: string,
  category: FileCategory
): boolean {
  return (
    category === "image" ||
    getFileExtension(filename) === "pdf" ||
    isTextPreviewFile(filename, category)
  );
}

/**
 * Sanitize filename to prevent directory traversal and illegal characters
 */
export function sanitizeFileName(name: string): string {
  const baseName = name.replace(/^.*[\\/]/, "");
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || "file";
}

/**
 * Validate that an S3 object key belongs strictly under uploads/ without traversal.
 */
export function isValidUploadKey(key: string | null | undefined): key is string {
  return Boolean(
    key &&
      key.startsWith("uploads/") &&
      key.length > "uploads/".length &&
      !key.includes("..") &&
      !key.includes("\\") &&
      !/[\x00-\x1f\x7f]/.test(key)
  );
}

/**
 * Checks whether a file's uploader matches any of the current user's identifiers.
 */
export function isFileOwnedByUser(
  uploadedBy: string | undefined,
  ...identifiers: Array<string | undefined | null>
): boolean {
  if (!uploadedBy) return false;
  const owner = uploadedBy.toLowerCase().trim();
  if (!owner || owner === "unassigned") return false;
  return identifiers.some(
    (id) => Boolean(id && id.toLowerCase().trim() === owner)
  );
}

/**
 * Escape special regex characters for safe literal MongoDB $regex matching.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build an RFC 6266 / RFC 5987 safe Content-Disposition header value.
 */
export function buildContentDisposition(
  disposition: "inline" | "attachment",
  filename: string
): string {
  const baseName = filename.replace(/^.*[\\/]/, "") || "download";
  const asciiFallback = baseName
    .replace(/[\r\n"\\]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_");
  const rfc5987 = encodeURIComponent(baseName).replace(
    /['()*!]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987}`;
}

/**
 * Format date into readable string with time
 */
export function formatDate(dateString: string | Date): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "Unknown date";
  }
}

/**
 * Format relative time (e.g. "5 minutes ago", "yesterday")
 */
export function formatRelativeTime(dateString: string | Date): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(d);
  } catch {
    return "";
  }
}
