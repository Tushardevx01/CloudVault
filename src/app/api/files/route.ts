import { NextRequest, NextResponse } from "next/server";
import { deleteS3File, getS3ConfigStatus } from "@/lib/s3";
import {
  listEnrichedS3Files,
  removeFileRecord,
  resolveCanonicalFileInfo,
} from "@/lib/mongodb";
import {
  isCallerFileOwner,
  parseValidatedKeyParam,
  requireAuthenticatedCaller,
} from "@/lib/requestAuth";
import { FileCategory, S3FileItem } from "@/types/file";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedCaller(
    request,
    "Authentication required to list files."
  );
  if (!auth.authorized) return auth.response;

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
    const category = searchParams.get("category") as
      | FileCategory
      | "all"
      | null;
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    let files = await listEnrichedS3Files({ sync: true });

    // Scope listing strictly to the signed-in user unless the caller is admin-only
    if (auth.user) {
      files = files.filter((f) => isCallerFileOwner(f.uploadedBy, auth.user));
    }

    if (search) {
      files = files.filter(
        (f) =>
          f.originalName.toLowerCase().includes(search) ||
          f.key.toLowerCase().includes(search)
      );
    }

    if (category && category !== "all") {
      files = files.filter((f) => f.category === category);
    }

    files.sort((a: S3FileItem, b: S3FileItem) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.originalName.localeCompare(b.originalName);
      } else if (sortBy === "size") {
        comparison = a.size - b.size;
      } else {
        comparison =
          new Date(a.lastModified).getTime() -
          new Date(b.lastModified).getTime();
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
  const auth = await requireAuthenticatedCaller(
    request,
    "Authentication required to delete files."
  );
  if (!auth.authorized) return auth.response;

  const config = getS3ConfigStatus();
  if (!config.isValid) {
    return NextResponse.json(
      { success: false, error: config.errorMessage },
      { status: 503 }
    );
  }

  const parsedKey = parseValidatedKeyParam(request);
  if (!parsedKey.valid) return parsedKey.response;
  const { key } = parsedKey;

  try {
    if (auth.user) {
      const info = await resolveCanonicalFileInfo(key);
      if (!info) {
        return NextResponse.json(
          { success: false, error: "Requested file was not found." },
          { status: 404 }
        );
      }

      if (!isCallerFileOwner(info.uploadedBy, auth.user)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Permission denied: You can only delete files that you have uploaded.",
          },
          { status: 403 }
        );
      }
    }

    await deleteS3File(key);

    const dbResult = await removeFileRecord(key);
    if (!dbResult.success) {
      console.warn(`MongoDB delete record warning for key ${key}`);
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
