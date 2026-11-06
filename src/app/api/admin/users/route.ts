import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import {
  getAllUsersWithStats,
  deleteUserAndFiles,
  syncS3FilesWithMongo,
} from "@/lib/mongodb";
import { listS3Files, deleteS3File } from "@/lib/s3";
import { formatBytes } from "@/lib/utils";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  try {
    // Optionally trigger background sync with S3 files if needed
    try {
      const s3Files = await listS3Files();
      await syncS3FilesWithMongo(s3Files);
    } catch (s3Err) {
      console.warn("S3 sync during admin fetch warning:", s3Err);
    }

    const users = await getAllUsersWithStats();

    const totalObjects = users.reduce((acc, u) => acc + u.objectCount, 0);
    const totalStorageBytes = users.reduce((acc, u) => acc + u.totalSizeBytes, 0);

    return NextResponse.json({
      success: true,
      users,
      metrics: {
        totalUsers: users.length,
        totalObjects,
        totalStorageBytes,
        totalStorageFormatted: formatBytes(totalStorageBytes),
        databaseStatus: "connected",
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
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get("userName");

    if (!userName) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: userName" },
        { status: 400 }
      );
    }

    // Delete all user's files from S3 and MongoDB
    const keysToDelete = await deleteUserAndFiles(userName);

    // Remove from S3
    for (const key of keysToDelete) {
      try {
        await deleteS3File(key);
      } catch (s3Err) {
        console.warn(`Could not delete S3 key ${key}:`, s3Err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `User "${userName}" and ${keysToDelete.length} uploaded object(s) were permanently deleted from Amazon S3 and MongoDB.`,
      deletedCount: keysToDelete.length,
      keys: keysToDelete,
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

