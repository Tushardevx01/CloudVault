import bcrypt from "bcryptjs";
import { Filter, Document } from "mongodb";
import { CloudUser, S3FileItem } from "@/types/file";
import { getDb, pingDatabase } from "./db";
import { addUsernameToBloomIfWarm, invalidateBloomFilter } from "./bloomFilter";
import { escapeRegExp, formatBytes, getFileCategory } from "./utils";
import { getS3ObjectMetadata, listS3Files } from "./s3";

export { getDb, pingDatabase };

const DEFAULT_ADMIN_USERNAME = "admin";
const SYNC_BATCH_SIZE = 5;

declare global {
  var _mongoSyncPromise: Promise<void> | undefined;
}

function toIsoStringSafe(value: unknown, fallback?: Date): string {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return (fallback || new Date()).toISOString();
}

function getOptionalIsoString(value: unknown): string | undefined {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return undefined;
}

async function getUserAliases(userName: string): Promise<string[]> {
  const clean = userName.trim();
  if (!clean) return [];
  const db = await getDb();
  const cleanLower = clean.toLowerCase();
  const nameRegex = new RegExp(`^${escapeRegExp(clean)}$`, "i");
  const userDoc = await db.collection("users").findOne(
    {
      $or: [{ username: cleanLower }, { name: { $regex: nameRegex } }],
    },
    { projection: { username: 1, name: 1 } }
  );

  const aliases = new Set<string>([clean]);
  if (typeof userDoc?.username === "string" && userDoc.username.trim()) {
    aliases.add(userDoc.username.trim());
  }
  if (typeof userDoc?.name === "string" && userDoc.name.trim()) {
    aliases.add(userDoc.name.trim());
  }
  return Array.from(aliases);
}

async function buildUserFilesFilter(userName: string): Promise<Filter<Document>> {
  const clean = userName.trim();
  if (!clean || clean.toLowerCase() === "unassigned") {
    return {
      $or: [
        { uploadedBy: { $regex: /^unassigned$/i } },
        { uploadedBy: null },
        { uploadedBy: "" },
        { uploadedBy: { $exists: false } },
      ],
    };
  }

  const aliases = await getUserAliases(clean);
  const regexes = aliases.map(
    (alias) => new RegExp(`^${escapeRegExp(alias)}$`, "i")
  );
  return regexes.length === 1
    ? { uploadedBy: { $regex: regexes[0] } }
    : { $or: regexes.map((r) => ({ uploadedBy: { $regex: r } })) };
}

/**
 * Checks whether a file's owner matches a target user (by username, display name, or Unassigned).
 */
export async function isFileOwnedByTargetUser(
  ownerName: string | undefined | null,
  targetUserName: string
): Promise<boolean> {
  const cleanTarget = targetUserName.trim().toLowerCase();
  const normalizedOwner = ownerName?.trim().toLowerCase() || "unassigned";
  if (cleanTarget === "unassigned") {
    return normalizedOwner === "unassigned";
  }
  const aliases = await getUserAliases(targetUserName);
  return aliases.some((alias) => alias.toLowerCase() === normalizedOwner);
}

/**
 * Seeds the default admin user if the admins collection does not have one yet.
 * Never overwrites an existing admin's stored password hash.
 */
export async function ensureAdminUser(): Promise<{
  username: string;
  seeded: boolean;
}> {
  const db = await getDb();
  const adminsCollection = db.collection("admins");

  const existingAdmin = await adminsCollection.findOne({
    username: DEFAULT_ADMIN_USERNAME,
  });

  if (existingAdmin) {
    return { username: DEFAULT_ADMIN_USERNAME, seeded: false };
  }

  const configuredPassword = process.env.ADMIN_DEFAULT_PASSWORD?.trim();
  if (!configuredPassword) {
    throw new Error(
      "No admin account exists and ADMIN_DEFAULT_PASSWORD is not configured in .env."
    );
  }

  const passwordHash = await bcrypt.hash(configuredPassword, 10);
  try {
    await adminsCollection.insertOne({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { username: DEFAULT_ADMIN_USERNAME, seeded: true };
  } catch (err: unknown) {
    const mongoErr = err as { code?: number };
    if (mongoErr.code === 11000) {
      return { username: DEFAULT_ADMIN_USERNAME, seeded: false };
    }
    throw err;
  }
}

/**
 * Verifies admin login credentials against MongoDB.
 */
export async function verifyAdminCredentials(
  username: string,
  pass: string
): Promise<{
  success: boolean;
  username?: string;
  role?: string;
  error?: string;
}> {
  try {
    await ensureAdminUser();
    const db = await getDb();
    const adminsCollection = db.collection("admins");

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return { success: false, error: "Invalid admin credentials." };
    }

    const admin = await adminsCollection.findOne({
      username: {
        $regex: new RegExp(`^${escapeRegExp(cleanUsername)}$`, "i"),
      },
    });

    if (!admin) {
      return { success: false, error: "Invalid admin credentials." };
    }

    const isMatch = await bcrypt.compare(pass, admin.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Invalid admin password." };
    }

    await adminsCollection.updateOne(
      { _id: admin._id },
      { $set: { lastLoginAt: new Date() } }
    );

    return {
      success: true,
      username: admin.username,
      role: admin.role || "admin",
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("Admin verification error:", error);
    return {
      success: false,
      error: error.message || "Database connection error.",
    };
  }
}

/**
 * Records a file upload in MongoDB and updates the corresponding user's stats.
 */
export async function recordFileUpload(
  file: {
    key: string;
    originalName: string;
    size: number;
    contentType: string;
    category: string;
    uploadedBy: string;
    uploadedAt?: Date;
    eTag?: string;
  },
  options?: { skipStatsRefresh?: boolean }
): Promise<void> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");
    const usersCollection = db.collection("users");

    const userName = file.uploadedBy.trim() || "Unassigned";
    const uploadDate = file.uploadedAt || new Date();

    await filesCollection.updateOne(
      { key: file.key },
      {
        $set: {
          key: file.key,
          originalName: file.originalName,
          size: file.size,
          contentType: file.contentType,
          category: file.category,
          uploadedBy: userName,
          uploadedAt: uploadDate,
          ...(file.eTag ? { eTag: file.eTag } : {}),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    if (userName !== "Unassigned" && userName.toLowerCase() !== "admin") {
      const lowerUsername = userName.toLowerCase();
      const nameRegex = new RegExp(`^${escapeRegExp(userName)}$`, "i");
      const existingUser = await usersCollection.findOne({
        $or: [{ username: lowerUsername }, { name: { $regex: nameRegex } }],
      });

      if (existingUser) {
        await usersCollection.updateOne(
          { _id: existingUser._id },
          { $set: { lastActiveAt: uploadDate } }
        );
      } else {
        try {
          await usersCollection.updateOne(
            { username: lowerUsername },
            {
              $set: { lastActiveAt: uploadDate },
              $setOnInsert: {
                username: lowerUsername,
                name: userName,
                createdAt: uploadDate,
                firstUploadAt: uploadDate,
                objectCount: 0,
                totalSizeBytes: 0,
              },
            },
            { upsert: true }
          );
          addUsernameToBloomIfWarm(lowerUsername);
        } catch (upsertErr: unknown) {
          const mongoErr = upsertErr as { code?: number };
          if (mongoErr.code !== 11000) throw upsertErr;
        }
      }

      if (!options?.skipStatsRefresh) {
        await refreshUserStats(userName);
      }
    }
  } catch (error) {
    console.error("Error recording file upload in MongoDB:", error);
    throw error;
  }
}

/**
 * Recalculates and caches a user's object count and total size from files collection.
 */
export async function refreshUserStats(userName: string): Promise<void> {
  try {
    const clean = userName.trim();
    if (!clean || clean.toLowerCase() === "unassigned" || clean.toLowerCase() === "admin") {
      return;
    }

    const db = await getDb();
    const filesCollection = db.collection("files");
    const usersCollection = db.collection("users");
    const fileFilter = await buildUserFilesFilter(clean);

    const stats = await filesCollection
      .aggregate([
        { $match: fileFilter },
        {
          $group: {
            _id: null,
            objectCount: { $sum: 1 },
            totalSizeBytes: { $sum: "$size" },
            lastActiveAt: { $max: "$uploadedAt" },
          },
        },
      ])
      .toArray();

    const userRegex = new RegExp(`^${escapeRegExp(clean)}$`, "i");
    const userFilter = {
      $or: [
        { username: clean.toLowerCase() },
        { name: { $regex: userRegex } },
      ],
    };

    if (stats.length > 0) {
      const agg = stats[0];
      await usersCollection.updateMany(userFilter, {
        $set: {
          objectCount: agg.objectCount,
          totalSizeBytes: agg.totalSizeBytes,
          lastActiveAt: agg.lastActiveAt,
        },
      });
    } else {
      await usersCollection.updateMany(userFilter, {
        $set: {
          objectCount: 0,
          totalSizeBytes: 0,
        },
      });
    }
  } catch (error) {
    console.error(`Error refreshing user stats for ${userName}:`, error);
  }
}

/**
 * Fetches all registered users with their uploaded object count and total storage.
 */
export async function getAllUsersWithStats(): Promise<CloudUser[]> {
  try {
    const db = await getDb();
    const usersCollection = db.collection("users");
    const filesCollection = db.collection("files");

    const fileAggregates = await filesCollection
      .aggregate([
        {
          $group: {
            _id: {
              $let: {
                vars: {
                  raw: { $trim: { input: { $ifNull: ["$uploadedBy", ""] } } },
                },
                in: {
                  $cond: [
                    { $eq: ["$$raw", ""] },
                    "unassigned",
                    { $toLower: "$$raw" },
                  ],
                },
              },
            },
            displayName: { $first: "$uploadedBy" },
            objectCount: { $sum: 1 },
            totalSizeBytes: { $sum: "$size" },
            lastActiveAt: { $max: "$uploadedAt" },
            firstUploadAt: { $min: "$uploadedAt" },
          },
        },
      ])
      .toArray();

    const existingUsers = await usersCollection.find({}).toArray();
    const userByKey = new Map<string, (typeof existingUsers)[0]>();

    for (const u of existingUsers) {
      if (typeof u.username === "string" && u.username.trim()) {
        userByKey.set(u.username.trim().toLowerCase(), u);
      }
      if (typeof u.name === "string" && u.name.trim()) {
        userByKey.set(u.name.trim().toLowerCase(), u);
      }
    }

    const groupedByUserId = new Map<
      string,
      {
        user: (typeof existingUsers)[0] | undefined;
        name: string;
        objectCount: number;
        totalSizeBytes: number;
        firstUploadAt?: Date;
        lastActiveAt?: Date;
      }
    >();
    const seenUserIds = new Set<string>();

    for (const agg of fileAggregates) {
      const lookupKey = String(agg._id || "unassigned").toLowerCase();
      const u = userByKey.get(lookupKey);
      const bucketId = u ? u._id.toString() : `virtual:${lookupKey}`;
      if (u) {
        seenUserIds.add(u._id.toString());
      }

      const existingEntry = groupedByUserId.get(bucketId);
      const aggFirst = agg.firstUploadAt ? new Date(agg.firstUploadAt) : undefined;
      const aggLast = agg.lastActiveAt ? new Date(agg.lastActiveAt) : undefined;

      if (existingEntry) {
        existingEntry.objectCount += agg.objectCount || 0;
        existingEntry.totalSizeBytes += agg.totalSizeBytes || 0;
        if (
          aggFirst &&
          (!existingEntry.firstUploadAt || aggFirst < existingEntry.firstUploadAt)
        ) {
          existingEntry.firstUploadAt = aggFirst;
        }
        if (
          aggLast &&
          (!existingEntry.lastActiveAt || aggLast > existingEntry.lastActiveAt)
        ) {
          existingEntry.lastActiveAt = aggLast;
        }
      } else {
        const displayName =
          lookupKey === "unassigned"
            ? "Unassigned"
            : u?.username || u?.name || agg.displayName || "Unassigned";
        groupedByUserId.set(bucketId, {
          user: u,
          name: displayName,
          objectCount: agg.objectCount || 0,
          totalSizeBytes: agg.totalSizeBytes || 0,
          firstUploadAt: aggFirst,
          lastActiveAt: aggLast,
        });
      }
    }

    const results: CloudUser[] = [];

    for (const entry of groupedByUserId.values()) {
      const u = entry.user;
      results.push({
        id: u?._id?.toString(),
        name: entry.name,
        email: u?.email,
        objectCount: entry.objectCount,
        totalSizeBytes: entry.totalSizeBytes,
        totalSizeFormatted: formatBytes(entry.totalSizeBytes),
        firstUploadAt: toIsoStringSafe(entry.firstUploadAt || u?.createdAt),
        lastActiveAt: toIsoStringSafe(entry.lastActiveAt || u?.lastActiveAt),
        createdAt: toIsoStringSafe(u?.createdAt || entry.firstUploadAt),
      });
    }

    for (const u of existingUsers) {
      if (seenUserIds.has(u._id.toString())) continue;
      results.push({
        id: u._id.toString(),
        name: u.username || u.name,
        email: u.email,
        objectCount: 0,
        totalSizeBytes: 0,
        totalSizeFormatted: "0 B",
        firstUploadAt: getOptionalIsoString(u.firstUploadAt),
        lastActiveAt: getOptionalIsoString(u.lastActiveAt),
        createdAt: toIsoStringSafe(u.createdAt),
      });
    }

    results.sort(
      (a, b) => b.objectCount - a.objectCount || a.name.localeCompare(b.name)
    );

    return results;
  } catch (error) {
    console.error("Error fetching users with stats from MongoDB:", error);
    throw error;
  }
}

/**
 * Returns all objects uploaded by a specific user (case-insensitive username match).
 */
export async function getUserFiles(userName: string): Promise<S3FileItem[]> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");
    const filter = await buildUserFilesFilter(userName);

    const docs = await filesCollection
      .find(filter)
      .sort({ uploadedAt: -1 })
      .toArray();

    return docs.map((doc) => ({
      key: doc.key,
      originalName: doc.originalName,
      size: doc.size,
      contentType: doc.contentType,
      category: doc.category,
      lastModified: toIsoStringSafe(doc.uploadedAt),
      eTag: doc.eTag,
      uploadedBy: doc.uploadedBy || "Unassigned",
    }));
  } catch (error) {
    console.error(`Error fetching files for user ${userName}:`, error);
    return [];
  }
}

/**
 * Fetches a file record by S3 key.
 */
export async function getFileRecordByKey(key: string): Promise<{
  key: string;
  originalName?: string;
  uploadedBy?: string;
  contentType?: string;
} | null> {
  try {
    const db = await getDb();
    const doc = await db.collection("files").findOne({ key });
    if (!doc) return null;
    return {
      key: doc.key,
      originalName: doc.originalName,
      uploadedBy: doc.uploadedBy,
      contentType: doc.contentType,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves canonical file metadata from MongoDB, falling back to S3 HeadObject.
 * Returns null if the object does not exist in either MongoDB or S3.
 */
export async function resolveCanonicalFileInfo(key: string): Promise<{
  key: string;
  originalName?: string;
  uploadedBy?: string;
  contentType?: string;
} | null> {
  const record = await getFileRecordByKey(key);
  if (record && record.originalName && record.uploadedBy) {
    return record;
  }

  const s3Meta = await getS3ObjectMetadata(key);
  if (!record && !s3Meta) {
    return null;
  }

  return {
    key,
    originalName: record?.originalName || s3Meta?.originalName,
    uploadedBy: record?.uploadedBy || s3Meta?.uploadedBy,
    contentType: record?.contentType || s3Meta?.contentType,
  };
}

/**
 * Deletes a file record from MongoDB and recalculates user stats.
 */
export async function removeFileRecord(
  key: string
): Promise<{ userName?: string; success: boolean; deleted?: boolean }> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");

    const file = await filesCollection.findOne({ key });
    if (!file) {
      return { success: true, deleted: false };
    }

    const res = await filesCollection.deleteOne({ key });
    if (file.uploadedBy) {
      await refreshUserStats(file.uploadedBy);
    }

    return {
      userName: file.uploadedBy,
      success: res.deletedCount > 0,
      deleted: res.deletedCount > 0,
    };
  } catch (error) {
    console.error(`Error removing file record for key ${key}:`, error);
    return { success: false, deleted: false };
  }
}

/**
 * Lists all S3 keys belonging to a user before deleting them from S3.
 */
export async function getUserFileKeys(userName: string): Promise<string[]> {
  try {
    const db = await getDb();
    const filter = await buildUserFilesFilter(userName);
    const files = await db
      .collection("files")
      .find(filter)
      .project({ key: 1 })
      .toArray();
    return files.map((f) => f.key as string).filter(Boolean);
  } catch (error) {
    console.error(`Error fetching keys for user ${userName}:`, error);
    return [];
  }
}

/**
 * Deletes specified file records and optionally the user document after S3 cleanup succeeds.
 */
export async function deleteUserRecordsAfterS3(
  userName: string,
  deletedKeys: string[],
  removeUserAccount: boolean
): Promise<void> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");
    const usersCollection = db.collection("users");
    const clean = userName.trim();
    const userRegex = new RegExp(`^${escapeRegExp(clean)}$`, "i");

    if (deletedKeys.length > 0) {
      await filesCollection.deleteMany({ key: { $in: deletedKeys } });
    }

    if (removeUserAccount && clean.toLowerCase() !== "unassigned") {
      await usersCollection.deleteMany({
        $or: [
          { username: clean.toLowerCase() },
          { name: { $regex: userRegex } },
        ],
      });
      invalidateBloomFilter();
    } else if (clean.toLowerCase() !== "unassigned") {
      await refreshUserStats(clean);
    }
  } catch (error) {
    console.error(`Error cleaning up MongoDB for user ${userName}:`, error);
    throw error;
  }
}

/**
 * Synchronizes existing S3 files missing from MongoDB and prunes stale records deleted from S3.
 */
export async function syncS3FilesWithMongo(
  s3Files: S3FileItem[]
): Promise<void> {
  if (globalThis._mongoSyncPromise) {
    return globalThis._mongoSyncPromise;
  }

  globalThis._mongoSyncPromise = (async () => {
    try {
      const db = await getDb();
      const filesCollection = db.collection("files");

      const existingDocs = await filesCollection
        .find({}, { projection: { key: 1, uploadedBy: 1 } })
        .toArray();

      const existingKeys = new Set<string>();
      const s3KeySet = new Set(s3Files.map((f) => f.key));
      const staleKeys: string[] = [];
      const affectedUsers = new Set<string>();

      for (const doc of existingDocs) {
        if (typeof doc.key !== "string" || !doc.key) continue;
        existingKeys.add(doc.key);
        if (!s3KeySet.has(doc.key)) {
          staleKeys.push(doc.key);
          if (typeof doc.uploadedBy === "string" && doc.uploadedBy.trim()) {
            affectedUsers.add(doc.uploadedBy.trim());
          }
        }
      }

      if (staleKeys.length > 0) {
        await filesCollection.deleteMany({ key: { $in: staleKeys } });
      }

      const missingFiles = s3Files.filter((f) => !existingKeys.has(f.key));

      for (let i = 0; i < missingFiles.length; i += SYNC_BATCH_SIZE) {
        const batch = missingFiles.slice(i, i + SYNC_BATCH_SIZE);
        await Promise.all(
          batch.map(async (s3File) => {
            const s3Meta = await getS3ObjectMetadata(s3File.key);
            const originalName = s3Meta?.originalName || s3File.originalName;
            const contentType = s3Meta?.contentType || s3File.contentType;
            const category =
              (s3Meta?.category as S3FileItem["category"]) ||
              getFileCategory(originalName, contentType);
            const uploadedBy =
              s3Meta?.uploadedBy || s3File.uploadedBy || "Unassigned";
            const uploadedAt = s3Meta?.uploadedAt
              ? new Date(s3Meta.uploadedAt)
              : new Date(s3File.lastModified);

            await recordFileUpload(
              {
                key: s3File.key,
                originalName,
                size: s3File.size,
                contentType,
                category,
                uploadedBy,
                uploadedAt: isNaN(uploadedAt.getTime())
                  ? new Date(s3File.lastModified)
                  : uploadedAt,
                eTag: s3Meta?.eTag || s3File.eTag,
              },
              { skipStatsRefresh: true }
            );

            if (uploadedBy !== "Unassigned") {
              affectedUsers.add(uploadedBy);
            }
          })
        );
      }

      if (affectedUsers.size > 0) {
        await Promise.all(
          Array.from(affectedUsers).map((u) => refreshUserStats(u))
        );
      }
    } catch (error) {
      console.warn("Could not sync S3 files with MongoDB:", error);
    } finally {
      globalThis._mongoSyncPromise = undefined;
    }
  })();

  return globalThis._mongoSyncPromise;
}

/**
 * Fetches map of S3 key -> rich metadata from MongoDB.
 */
export async function getFileMetadataMap(): Promise<
  Map<
    string,
    {
      originalName?: string;
      contentType?: string;
      category?: S3FileItem["category"];
      uploadedBy?: string;
      uploadedAt?: Date;
      eTag?: string;
    }
  >
> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");
    const docs = await filesCollection
      .find(
        {},
        {
          projection: {
            key: 1,
            originalName: 1,
            contentType: 1,
            category: 1,
            uploadedBy: 1,
            uploadedAt: 1,
            eTag: 1,
          },
        }
      )
      .toArray();

    const map = new Map<
      string,
      {
        originalName?: string;
        contentType?: string;
        category?: S3FileItem["category"];
        uploadedBy?: string;
        uploadedAt?: Date;
        eTag?: string;
      }
    >();
    for (const doc of docs) {
      if (doc.key) {
        map.set(doc.key, {
          originalName: doc.originalName,
          contentType: doc.contentType,
          category: doc.category,
          uploadedBy: doc.uploadedBy,
          uploadedAt: doc.uploadedAt,
          eTag: doc.eTag,
        });
      }
    }
    return map;
  } catch (error) {
    console.warn("Could not fetch file metadata map from MongoDB:", error);
    return new Map();
  }
}

/**
 * Lists all S3 objects enriched with MongoDB metadata (and optionally syncs missing/stale rows).
 */
export async function listEnrichedS3Files(options?: {
  sync?: boolean;
}): Promise<S3FileItem[]> {
  const files = await listS3Files();

  try {
    if (options?.sync) {
      await syncS3FilesWithMongo(files);
    }
    const metaMap = await getFileMetadataMap();
    return files.map((f) => {
      const meta = metaMap.get(f.key);
      const originalName = meta?.originalName || f.originalName;
      const contentType = meta?.contentType || f.contentType;
      return {
        ...f,
        originalName,
        contentType,
        category: meta?.category || getFileCategory(originalName, contentType),
        uploadedBy: meta?.uploadedBy || f.uploadedBy || "Unassigned",
        eTag: meta?.eTag || f.eTag,
      };
    });
  } catch {
    return files;
  }
}
