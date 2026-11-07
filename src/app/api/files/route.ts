import { NextRequest, NextResponse } from "next/server";
import { listS3Files, deleteS3File, getS3ConfigStatus } from "@/lib/s3";
import {
  removeFileRecord,
  getFileMetadataMap,
  syncS3FilesWithMongo,
  getDb,
} from "@/lib/mongodb";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getUserFromRequest } from "@/lib/userAuth";
import { FileCategory, S3FileItem } from "@/types/file";

export async function GET(request: NextRequest) {
  const config = getS3ConfigStatus();
  if (!config.isValid) {
    return NextResponse.json(
      {
        success: false,
        error: config.errorMessage,
        files: [],
      },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const category = searchParams.get("category") as FileCategory | "all" | null;
    const sortBy = searchParams.get("sortBy") || "date"; // 'date' | 'name' | 'size'
    const sortOrder = searchParams.get("sortOrder") || "desc"; // 'asc' | 'desc'

    let files = await listS3Files();

    // Attach uploader info from MongoDB
    try {
      await syncS3FilesWithMongo(files);
      const metaMap = await getFileMetadataMap();
      files = files.map((f) => {
        const meta = metaMap.get(f.key);
        return {
          ...f,
          uploadedBy: meta?.uploadedBy || f.uploadedBy || "Community",
        };
      });
    } catch {
      // ignore
    }

    // Search filter
    if (search) {
      files = files.filter(
        (f) =>
          f.originalName.toLowerCase().includes(search) ||
          f.key.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (category && category !== "all") {
      files = files.filter((f) => f.category === category);
    }

    // Sorting
    files.sort((a: S3FileItem, b: S3FileItem) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.originalName.localeCompare(b.originalName);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      } else {
        // default date
        comparison =
          new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return NextResponse.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error listing files from S3:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to list files from Amazon S3.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const config = getS3ConfigStatus();
  if (!config.isValid) {
    return NextResponse.json(
      { success: false, error: config.errorMessage },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: key" },
        { status: 400 }
      );
    }

    // Security check: Key must be within 'uploads/' prefix and not contain directory traversal
    if (!key.startsWith("uploads/") || key.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Invalid object key or unauthorized path." },
        { status: 400 }
      );
    }

    // 1. Authorization check: Admin or authenticated user
    const isAdmin = isAdminAuthenticated(request);
    const sessionUser = getUserFromRequest(request);

    if (!isAdmin && !sessionUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to delete files." },
        { status: 401 }
      );
    }

    // 2. Normal user permission check: only allowed to delete their own files
    if (!isAdmin && sessionUser) {
      const db = await getDb();
      const fileRecord = await db.collection("files").findOne({ key });

      const fileOwner = fileRecord?.uploadedBy?.toLowerCase()?.trim();
      const currentUserName = sessionUser.username?.toLowerCase()?.trim();
      const currentDisplayName = sessionUser.name?.toLowerCase()?.trim();

      const isOwner =
        fileOwner &&
        (fileOwner === currentUserName || fileOwner === currentDisplayName);

      if (!isOwner) {
        return NextResponse.json(
          {
            success: false,
            error: "Permission denied: You can only delete files that you have uploaded.",
          },
          { status: 403 }
        );
      }
    }

    await deleteS3File(key);

    try {
      await removeFileRecord(key);
    } catch (mongoErr) {
      console.warn("MongoDB delete record warning:", mongoErr);
    }

    return NextResponse.json({
      success: true,
      message: `File "${key}" successfully deleted.`,
      key,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error deleting file from S3:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to delete file from Amazon S3.",
      },
      { status: 500 }
    );
  }
}
