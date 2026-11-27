import { NextRequest, NextResponse } from "next/server";
import { uploadToS3, getS3ConfigStatus } from "@/lib/s3";
import { recordFileUpload } from "@/lib/mongodb";
import { requireAuthenticatedCaller } from "@/lib/requestAuth";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_FORMATTED } from "@/lib/constants";
import { S3FileItem } from "@/types/file";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedCaller(
    request,
    "Authentication required to upload files."
  );
  if (!auth.authorized) return auth.response;

  const config = getS3ConfigStatus();
  if (!config.isValid) {
    return NextResponse.json(
      { success: false, error: config.errorMessage },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      const singleFile = formData.get("file");
      if (singleFile instanceof File) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided in the upload request." },
        { status: 400 }
      );
    }

    // Derive uploader from verified session; admins may explicitly target a userName
    const adminRequestedUser = auth.isAdmin
      ? (formData.get("userName") as string | null)?.trim()
      : undefined;
    const uploaderName =
      (adminRequestedUser && auth.isAdmin ? adminRequestedUser : undefined) ||
      auth.user?.username ||
      auth.user?.name ||
      auth.adminUsername ||
      "admin";

    const uploadedItems: S3FileItem[] = [];
    const errors: { index: number; name: string; error: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name || !file.name.trim()) {
        errors.push({
          index: i,
          name: "(unnamed)",
          error: "File must have a valid filename.",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        errors.push({
          index: i,
          name: file.name,
          error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${MAX_FILE_SIZE_FORMATTED}.`,
        });
        continue;
      }

      if (file.size === 0) {
        errors.push({
          index: i,
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
          uploadedBy: uploaderName,
        });

        try {
          await recordFileUpload({
            key: uploaded.key,
            originalName: uploaded.originalName,
            size: uploaded.size,
            contentType: uploaded.contentType,
            category: uploaded.category,
            uploadedBy: uploaderName,
            uploadedAt: new Date(uploaded.lastModified),
            eTag: uploaded.eTag,
          });
        } catch (dbErr) {
          console.warn("MongoDB record upload warning:", dbErr);
        }

        uploadedItems.push(uploaded);
      } catch (err: unknown) {
        const error = err as { message?: string };
        errors.push({
          index: i,
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
