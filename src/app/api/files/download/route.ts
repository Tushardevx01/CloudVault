import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import {
  getPresignedFileUrl,
  extractOriginalName,
  getS3ConfigStatus,
  getS3ObjectStream,
} from "@/lib/s3";
import { resolveCanonicalFileInfo } from "@/lib/mongodb";
import {
  isCallerFileOwner,
  parseValidatedKeyParam,
  requireAuthenticatedCaller,
} from "@/lib/requestAuth";
import { buildContentDisposition } from "@/lib/utils";
import { PRESIGNED_URL_EXPIRY_SECONDS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedCaller(
    request,
    "Authentication required to download files."
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
            "Permission denied: You can only download files that you have uploaded.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const stream = searchParams.get("stream") === "true";
    const json = searchParams.get("json") === "true";

    const filename = fileInfo.originalName || extractOriginalName(key);

    if (stream) {
      const s3Response = await getS3ObjectStream(key);
      if (!s3Response.Body) {
        return NextResponse.json(
          { success: false, error: "File body not found in storage." },
          { status: 404 }
        );
      }

      const headers = new Headers();
      headers.set(
        "Content-Type",
        s3Response.ContentType || "application/octet-stream"
      );
      headers.set(
        "Content-Disposition",
        buildContentDisposition("attachment", filename)
      );
      if (typeof s3Response.ContentLength === "number") {
        headers.set("Content-Length", s3Response.ContentLength.toString());
      }

      const body = s3Response.Body as {
        transformToWebStream?: () => ReadableStream;
      };
      const webStream =
        typeof body.transformToWebStream === "function"
          ? body.transformToWebStream()
          : (Readable.toWeb(
              s3Response.Body as unknown as Readable
            ) as unknown as ReadableStream);

      return new NextResponse(webStream, {
        status: 200,
        headers,
      });
    }

    const downloadUrl = await getPresignedFileUrl(
      key,
      "attachment",
      filename,
      PRESIGNED_URL_EXPIRY_SECONDS
    );

    if (json) {
      return NextResponse.json({
        success: true,
        downloadUrl,
        filename,
      });
    }

    return NextResponse.redirect(downloadUrl, 307);
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
    console.error("Error generating download URL:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          status === 404
            ? "Requested file was not found in Amazon S3."
            : err.message || "Failed to generate download URL.",
      },
      { status }
    );
  }
}
