import { NextRequest, NextResponse } from "next/server";
import {
  parseValidatedKeyParam,
  requireAdminCaller,
} from "@/lib/requestAuth";
import {
  getUserFiles,
  isFileOwnedByTargetUser,
  removeFileRecord,
  resolveCanonicalFileInfo,
} from "@/lib/mongodb";
import { deleteS3File } from "@/lib/s3";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userName: string }> }
) {
  const adminAuth = await requireAdminCaller(request);
  if (!adminAuth.authorized) return adminAuth.response;

  try {
    const { userName } = await context.params;
    const targetUserName = userName.trim();
    if (!targetUserName) {
      return NextResponse.json(
        { success: false, error: "Invalid user name parameter." },
        { status: 400 }
      );
    }

    const files = await getUserFiles(targetUserName);

    return NextResponse.json({
      success: true,
      userName: targetUserName,
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
  const adminAuth = await requireAdminCaller(request);
  if (!adminAuth.authorized) return adminAuth.response;

  const parsedKey = parseValidatedKeyParam(request);
  if (!parsedKey.valid) return parsedKey.response;
  const { key } = parsedKey;

  try {
    const { userName } = await context.params;
    const targetUserName = userName.trim();
    if (!targetUserName) {
      return NextResponse.json(
        { success: false, error: "Invalid user name parameter." },
        { status: 400 }
      );
    }

    const info = await resolveCanonicalFileInfo(key);
    if (!info) {
      return NextResponse.json(
        { success: false, error: "File record not found." },
        { status: 404 }
      );
    }

    const ownsFile = await isFileOwnedByTargetUser(
      info.uploadedBy,
      targetUserName
    );
    if (!ownsFile) {
      return NextResponse.json(
        {
          success: false,
          error: `Object "${key}" does not belong to user "${targetUserName}".`,
        },
        { status: 403 }
      );
    }

    await deleteS3File(key);
    const dbResult = await removeFileRecord(key);
    if (!dbResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Deleted object "${key}" from Amazon S3, but failed to update MongoDB metadata.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Object "${key}" uploaded by "${targetUserName}" was successfully deleted from Amazon S3 and MongoDB.`,
      key,
      userName: targetUserName,
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
