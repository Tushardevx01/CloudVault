import { NextRequest, NextResponse } from "next/server";
import { requireAdminCaller } from "@/lib/requestAuth";
import {
  getAllUsersWithStats,
  getUserFileKeys,
  deleteUserRecordsAfterS3,
  syncS3FilesWithMongo,
} from "@/lib/mongodb";
import { listS3Files, deleteS3File, getBucketName } from "@/lib/s3";
import { formatBytes } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const adminAuth = await requireAdminCaller(request);
  if (!adminAuth.authorized) return adminAuth.response;

  try {
    try {
      const s3Files = await listS3Files();
      await syncS3FilesWithMongo(s3Files);
    } catch (s3Err) {
      console.warn("S3 sync during admin fetch warning:", s3Err);
    }

    const users = await getAllUsersWithStats();

    const totalObjects = users.reduce((acc, u) => acc + u.objectCount, 0);
    const totalStorageBytes = users.reduce(
      (acc, u) => acc + u.totalSizeBytes,
      0
    );

    return NextResponse.json({
      success: true,
      users,
      metrics: {
        totalUsers: users.length,
        totalObjects,
        totalStorageBytes,
        totalStorageFormatted: formatBytes(totalStorageBytes),
        databaseStatus: "connected",
        bucketName: getBucketName(),
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error fetching admin users:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch users from database.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const adminAuth = await requireAdminCaller(request);
  if (!adminAuth.authorized) return adminAuth.response;

  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get("userName")?.trim();

    if (!userName) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: userName" },
        { status: 400 }
      );
    }

    const keysToDelete = await getUserFileKeys(userName);
    const deletedKeys: string[] = [];
    const failedKeys: string[] = [];

    for (const key of keysToDelete) {
      try {
        await deleteS3File(key);
        deletedKeys.push(key);
      } catch (s3Err) {
        console.warn(`Could not delete S3 key ${key}:`, s3Err);
        failedKeys.push(key);
      }
    }

    // Only remove records whose S3 objects were deleted; preserve user if S3 cleanup partially failed
    await deleteUserRecordsAfterS3(
      userName,
      deletedKeys,
      failedKeys.length === 0
    );

    if (failedKeys.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Deleted ${deletedKeys.length} object(s), but failed to delete ${failedKeys.length} object(s) from Amazon S3. User record was preserved for retry.`,
          deletedCount: deletedKeys.length,
          failedKeys,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User "${userName}" and ${deletedKeys.length} uploaded object(s) were permanently deleted from Amazon S3 and MongoDB.`,
      deletedCount: deletedKeys.length,
      keys: deletedKeys,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error deleting user:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete user." },
      { status: 500 }
    );
  }
}
