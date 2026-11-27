import { NextResponse } from "next/server";
import { getS3ConfigStatus, testS3Connectivity } from "@/lib/s3";
import { pingDatabase } from "@/lib/mongodb";

export async function GET() {
  const config = getS3ConfigStatus();
  const databaseConnected = await pingDatabase();

  if (!config.isValid) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        connected: false,
        databaseConnected,
        missingVariables: config.missingVariables,
        bucket: config.bucketName,
        region: config.region,
        message: config.errorMessage,
      },
      { status: 503 }
    );
  }

  const connectivity = await testS3Connectivity();

  return NextResponse.json(
    {
      success: connectivity.connected,
      configured: true,
      connected: connectivity.connected,
      databaseConnected,
      bucket: connectivity.bucket,
      region: connectivity.region,
      message: connectivity.message,
    },
    { status: connectivity.connected ? 200 : 503 }
  );
}
