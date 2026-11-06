import { NextRequest, NextResponse } from "next/server";
import { uploadToS3, getS3ConfigStatus } from "@/lib/s3";
import { recordFileUpload } from "@/lib/mongodb";
import { S3FileItem } from "@/types/file";

// 50MB maximum single file size for standard route handler
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const config = getS3ConfigStatus();
  if (!config.isValid) {
    return NextResponse.json(
      { success: false, error: config.errorMessage },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const userName =
      (formData.get("userName") as string)?.trim() ||
      (formData.get("uploaderName") as string)?.trim() ||
      "Aditya";

    if (!files || files.length === 0) {
      // Check single "file" fallback
      const singleFile = formData.get("file") as File | null;
      if (singleFile) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided in the upload request." },
        { status: 400 }
      );
    }

    const uploadedItems: S3FileItem[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const file of files) {
      if (!file || !file.name) continue;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          name: file.name,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 50MB.`,
        });
        continue;
      }

      if (file.size === 0) {
        errors.push({
          name: file.name,
          error: "Empty files cannot be uploaded.",
        });
        continue;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const uploaded = await uploadToS3({
          buffer,
          originalFileName: file.name,
          contentType: file.type || "application/octet-stream",
          uploadedBy: userName,
        });

        // Record in MongoDB
        try {
          await recordFileUpload({
            key: uploaded.key,
            originalName: uploaded.originalName,
            size: uploaded.size,
            contentType: uploaded.contentType,
            category: uploaded.category,
            uploadedBy: userName,
            uploadedAt: new Date(uploaded.lastModified),
          });
        } catch (dbErr) {
          console.warn("MongoDB record upload warning:", dbErr);
        }

        uploadedItems.push(uploaded);
      } catch (err: unknown) {
        const error = err as { message?: string };
        errors.push({
          name: file.name,
          error: error.message || "Failed to upload file to Amazon S3.",
        });
      }
    }

    if (uploadedItems.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All uploads failed.",
          details: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedItems.length} file(s) to Amazon S3.`,
      uploaded: uploadedItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error during file upload.",
      },
      { status: 500 }
    );
  }
}
