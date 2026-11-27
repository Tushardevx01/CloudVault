import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE_NAME } from "@/lib/userAuth";
import { isSecureRequest } from "@/lib/token";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  response.cookies.set(USER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
