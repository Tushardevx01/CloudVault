import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/userAuth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}

