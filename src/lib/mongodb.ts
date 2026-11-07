import { MongoClient, Db } from "mongodb";
import bcrypt from "bcryptjs";
import { CloudUser, S3FileItem } from "@/types/file";
import { formatBytes } from "./utils";

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://tkddey2033929837_db_user:fskjlrjVKktZCMVx@cluster0.w4a6jzg.mongodb.net/cloudvault?retryWrites=true&w=majority";

const DB_NAME = "cloudvault";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || "Adamas@2023";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  const client = new MongoClient(uri);
  clientPromise = client.connect();
}

/**
 * Returns the MongoDB Database instance.
 */
export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

/**
 * Ensures the default Admin user is seeded and stored in MongoDB with the designated password.
 */
export async function ensureAdminUser(): Promise<{ username: string; seeded: boolean }> {
  try {
    const db = await getDb();
    const adminsCollection = db.collection("admins");

    const existingAdmin = await adminsCollection.findOne({ username: DEFAULT_ADMIN_USERNAME });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await adminsCollection.insertOne({
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { username: DEFAULT_ADMIN_USERNAME, seeded: true };
    }

    // If existing admin password needs verification or update
    const matches = await bcrypt.compare(DEFAULT_ADMIN_PASSWORD, existingAdmin.passwordHash);
    if (!matches) {
      const newHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await adminsCollection.updateOne(
        { username: DEFAULT_ADMIN_USERNAME },
        { $set: { passwordHash: newHash, updatedAt: new Date() } }
      );
    }

    return { username: DEFAULT_ADMIN_USERNAME, seeded: false };
  } catch (error) {
    console.error("Error ensuring admin user in MongoDB:", error);
    throw error;
  }
}

/**
 * Verifies admin login credentials against MongoDB.
 */
export async function verifyAdminCredentials(
  username: string,
  pass: string
): Promise<{ success: boolean; username?: string; role?: string; error?: string }> {
  try {
    await ensureAdminUser();
    const db = await getDb();
    const adminsCollection = db.collection("admins");

    const admin = await adminsCollection.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
    });

    if (!admin) {
      return { success: false, error: "Invalid admin credentials." };
    }

    const isMatch = await bcrypt.compare(pass, admin.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Invalid admin password." };
    }

    // Update last login
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
    return { success: false, error: error.message || "Database connection error." };
  }
}

/**
 * Records a file upload in MongoDB and updates the corresponding user's stats.
 */
export async function recordFileUpload(file: {
  key: string;
  originalName: string;
  size: number;
  contentType: string;
  category: string;
  uploadedBy: string;
  uploadedAt?: Date;
  eTag?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");
    const usersCollection = db.collection("users");

    const userName = (file.uploadedBy || "Aditya").trim();
    const uploadDate = file.uploadedAt || new Date();

    // Upsert file record
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
          eTag: file.eTag,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Upsert / update user
    await usersCollection.updateOne(
      { name: userName },
      {
        $setOnInsert: {
          name: userName,
          createdAt: uploadDate,
          firstUploadAt: uploadDate,
        },
        $set: {
          lastActiveAt: uploadDate,
        },
      },
      { upsert: true }
    );

    // Refresh user's actual aggregates from files collection
    await refreshUserStats(userName);
  } catch (error) {
    console.error("Error recording file upload in MongoDB:", error);
  }
}

/**
 * Recalculates and caches a user's object count and total size from files collection.
 */
export async function refreshUserStats(userName: string): Promise<void> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");
    const usersCollection = db.collection("users");

    const stats = await filesCollection
      .aggregate([
        { $match: { uploadedBy: userName } },
        {
          $group: {
            _id: "$uploadedBy",
            objectCount: { $sum: 1 },
            totalSizeBytes: { $sum: "$size" },
            lastActiveAt: { $max: "$uploadedAt" },
          },
        },
      ])
      .toArray();

    if (stats.length > 0) {
      const agg = stats[0];
      await usersCollection.updateOne(
        { name: userName },
        {
          $set: {
            objectCount: agg.objectCount,
            totalSizeBytes: agg.totalSizeBytes,
            lastActiveAt: agg.lastActiveAt,
          },
        }
      );
    } else {
      await usersCollection.updateOne(
        { name: userName },
        {
          $set: {
            objectCount: 0,
            totalSizeBytes: 0,
          },
        }
      );
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

    // Aggregate directly from files to guarantee 100% synchronization
    const fileAggregates = await filesCollection
      .aggregate([
        {
          $group: {
            _id: "$uploadedBy",
            objectCount: { $sum: 1 },
            totalSizeBytes: { $sum: "$size" },
            lastActiveAt: { $max: "$uploadedAt" },
            firstUploadAt: { $min: "$uploadedAt" },
          },
        },
      ])
      .toArray();

    const existingUsers = await usersCollection.find({}).toArray();
    const userMap = new Map<string, (typeof existingUsers)[0]>();

    existingUsers.forEach((u) => {
      userMap.set(u.name, u);
    });

    const results: CloudUser[] = [];

    // Combine aggregates
    for (const agg of fileAggregates) {
      const name = agg._id || "Anonymous";
      const u = userMap.get(name);

      results.push({
        id: u?._id?.toString(),
        name,
        email: u?.email,
        objectCount: agg.objectCount || 0,
        totalSizeBytes: agg.totalSizeBytes || 0,
        totalSizeFormatted: formatBytes(agg.totalSizeBytes || 0),
        firstUploadAt: (agg.firstUploadAt || u?.createdAt || new Date()).toISOString(),
        lastActiveAt: (agg.lastActiveAt || u?.lastActiveAt || new Date()).toISOString(),
        createdAt: (u?.createdAt || agg.firstUploadAt || new Date()).toISOString(),
      });

      userMap.delete(name);
    }

    // Add users who might not have any files right now
    for (const [, u] of userMap) {
      results.push({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        objectCount: 0,
        totalSizeBytes: 0,
        totalSizeFormatted: "0 B",
        firstUploadAt: u.firstUploadAt?.toISOString?.() || undefined,
        lastActiveAt: u.lastActiveAt?.toISOString?.() || undefined,
        createdAt: u.createdAt?.toISOString?.() || new Date().toISOString(),
      });
    }

    // Sort by objectCount descending, then name ascending
    results.sort((a, b) => b.objectCount - a.objectCount || a.name.localeCompare(b.name));

    return results;
  } catch (error) {
    console.error("Error fetching users with stats from MongoDB:", error);
    return [];
  }
}

/**
 * Returns all objects uploaded by a specific user.
 */
export async function getUserFiles(userName: string): Promise<S3FileItem[]> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");

    const docs = await filesCollection
      .find({ uploadedBy: userName })
      .sort({ uploadedAt: -1 })
      .toArray();

    return docs.map((doc) => ({
      key: doc.key,
      originalName: doc.originalName,
      size: doc.size,
      contentType: doc.contentType,
      category: doc.category,
      lastModified: (doc.uploadedAt || new Date()).toISOString(),
      eTag: doc.eTag,
      uploadedBy: doc.uploadedBy,
    }));
  } catch (error) {
    console.error(`Error fetching files for user ${userName}:`, error);
    return [];
  }
}

/**
 * Deletes a file record from MongoDB and decrements user stats.
 */
export async function removeFileRecord(key: string): Promise<{ userName?: string; success: boolean }> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");

    const file = await filesCollection.findOne({ key });
    if (!file) {
      return { success: false };
    }

    await filesCollection.deleteOne({ key });
    if (file.uploadedBy) {
      await refreshUserStats(file.uploadedBy);
    }

    return { userName: file.uploadedBy, success: true };
  } catch (error) {
    console.error(`Error removing file record for key ${key}:`, error);
    return { success: false };
  }
}

/**
 * Deletes a user and their file records from MongoDB.
 * Returns the list of S3 object keys to be deleted from S3.
 */
export async function deleteUserAndFiles(userName: string): Promise<string[]> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");
    const usersCollection = db.collection("users");

    // Fetch keys for S3 removal
    const files = await filesCollection.find({ uploadedBy: userName }).project({ key: 1 }).toArray();
    const keys = files.map((f) => f.key);

    await filesCollection.deleteMany({ uploadedBy: userName });
    await usersCollection.deleteOne({ name: userName });

    return keys;
  } catch (error) {
    console.error(`Error deleting user ${userName}:`, error);
    return [];
  }
}

/**
 * Synchronizes existing S3 files with MongoDB records if any are missing.
 */
export async function syncS3FilesWithMongo(s3Files: S3FileItem[]): Promise<void> {
  try {
    const db = await getDb();
    const filesCollection = db.collection("files");

    const existingKeys = new Set(
      (await filesCollection.find({}, { projection: { key: 1 } }).toArray()).map((f) => f.key)
    );

    const defaultNames = ["Aditya", "Tushar", "Sankalpa", "Purabi"];
    let nameIndex = 0;

    for (const s3File of s3Files) {
      if (!existingKeys.has(s3File.key)) {
        // Attribute to a known team member or s3File.uploadedBy
        const assignedUser = s3File.uploadedBy || defaultNames[nameIndex % defaultNames.length];
        nameIndex++;

        await recordFileUpload({
          key: s3File.key,
          originalName: s3File.originalName,
          size: s3File.size,
          contentType: s3File.contentType,
          category: s3File.category,
          uploadedBy: assignedUser,
          uploadedAt: new Date(s3File.lastModified),
          eTag: s3File.eTag,
        });
      }
    }
  } catch (error) {
    console.warn("Could not sync S3 files with MongoDB:", error);
  }
}

