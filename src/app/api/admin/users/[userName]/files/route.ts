import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { getUserFiles, removeFileRecord } from "@/lib/mongodb";
import { deleteS3File } from "@/lib/s3";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userName: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { userName } = await context.params;
    const decodedUserName = decodeURIComponent(userName);

    const files = await getUserFiles(decodedUserName);

    return NextResponse.json({
      success: true,
      userName: decodedUserName,
      count: files.length,
      files,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error fetching user files:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch user files." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userName: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Admin session required." },
      { status: 401 }
    );
  }

  try {
    const { userName } = await context.params;
    const decodedUserName = decodeURIComponent(userName);

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: key" },
        { status: 400 }
      );
    }

    if (!key.startsWith("uploads/") || key.includes("..")) {
      return NextResponse.json(
        { success: false, error: "Invalid object key." },
        { status: 400 }
      );
    }

    // 1. Delete from S3
    await deleteS3File(key);

    // 2. Delete from MongoDB
    await removeFileRecord(key);

    return NextResponse.json({
      success: true,
      message: `Object "${key}" uploaded by "${decodedUserName}" was successfully deleted from Amazon S3 and MongoDB.`,
      key,
      userName: decodedUserName,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error deleting user object:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete user object." },
      { status: 500 }
    );
  }
}

