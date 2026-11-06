export interface S3FileItem {
  key: string;
  originalName: string;
  size: number;
  lastModified: string;
  contentType: string;
  category: FileCategory;
  url?: string;
  eTag?: string;
  uploadedBy?: string;
}

export type FileCategory =
  | "image"
  | "document"
  | "media"
  | "archive"
  | "code"
  | "other";

export interface StorageStats {
  totalFiles: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  categories: Record<
    FileCategory,
    {
      count: number;
      sizeBytes: number;
      sizeFormatted: string;
      percentage: number;
    }
  >;
  recentUploads: S3FileItem[];
  bucketName: string;
  region: string;
  storageHealth: "connected" | "misconfigured" | "credentials_missing";
}

export interface CloudUser {
  id?: string;
  name: string;
  email?: string;
  objectCount: number;
  totalSizeBytes: number;
  totalSizeFormatted?: string;
  firstUploadAt?: string;
  lastActiveAt?: string;
  createdAt: string;
}

export interface AdminDashboardData {
  users: CloudUser[];
  totalUsers: number;
  totalObjects: number;
  totalStorageBytes: number;
  totalStorageFormatted: string;
  databaseStatus: "connected" | "disconnected";
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
