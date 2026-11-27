import { NextRequest, NextResponse } from "next/server";
import {
  getPresignedFileUrl,
  extractOriginalName,
  getS3ConfigStatus,
  getS3ObjectTextPreview,
} from "@/lib/s3";
import { resolveCanonicalFileInfo } from "@/lib/mongodb";
import {
  isCallerFileOwner,
  parseValidatedKeyParam,
  requireAuthenticatedCaller,
} from "@/lib/requestAuth";
import {
  getFileCategory,
  getFileExtension,
  isTextPreviewFile,
} from "@/lib/utils";
import { PRESIGNED_URL_EXPIRY_SECONDS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedCaller(
    request,
    "Authentication required to preview files."
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
    const fileInfo = await resolveCanonicalFileInfo(key);
    if (!fileInfo) {
      return NextResponse.json(
        { success: false, error: "Requested file was not found in storage." },
        { status: 404 }
      );
    }

    if (!auth.isAdmin && !isCallerFileOwner(fileInfo.uploadedBy, auth.user)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Permission denied: You can only preview files that you have uploaded.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const textMode = searchParams.get("text") === "true";

    const filename = fileInfo.originalName || extractOriginalName(key);
    const category = getFileCategory(filename, fileInfo.contentType);

    if (textMode) {
      if (!isTextPreviewFile(filename, category)) {
        return NextResponse.json(
          {
            success: false,
            error: "Text preview is only supported for code and plain-text files.",
          },
          { status: 400 }
        );
      }

      const textPreview = await getS3ObjectTextPreview(key);
      return NextResponse.json({
        success: true,
        key,
        filename,
        category,
        content: textPreview.content,
        truncated: textPreview.truncated,
        totalSize: textPreview.totalSize,
      });
    }

    const isInlineMedia =
      category === "image" || getFileExtension(filename) === "pdf";
    if (!isInlineMedia) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Inline URL preview is only supported for image and PDF files.",
        },
        { status: 400 }
      );
    }

    const previewUrl = await getPresignedFileUrl(
      key,
      "inline",
      filename,
      PRESIGNED_URL_EXPIRY_SECONDS
    );

    return NextResponse.json({
      success: true,
      key,
      filename,
      previewUrl,
      category,
    });
  } catch (error: unknown) {
    const err = error as {
      name?: string;
      message?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const status =
      err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404
        ? 404
        : 500;
    console.error("Error generating preview:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          status === 404
            ? "Requested file was not found in Amazon S3."
            : err.message || "Failed to generate file preview.",
      },
      { status }
    );
  }
}
