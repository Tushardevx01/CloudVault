import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/lib/mongodb";
import {
  createAdminToken,
  isAdminAuthenticated,
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = (body.username || "admin").trim();
    const password = body.password || "";

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Admin password is required." },
        { status: 400 }
      );
    }

    const verification = await verifyAdminCredentials(username, password);

    if (!verification.success) {
      return NextResponse.json(
        {
          success: false,
          error: verification.error || "Authentication failed. Invalid password.",
        },
        { status: 401 }
      );
    }

    const token = createAdminToken(verification.username || username);

    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful.",
      username: verification.username || username,
      token,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Admin login error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const isAuth = isAdminAuthenticated(request);
  return NextResponse.json({
    authenticated: isAuth,
    username: isAuth ? "admin" : null,
  });
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: "Admin logged out successfully.",
  });

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

