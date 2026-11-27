import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials } from "@/lib/mongodb";
import {
  createAdminToken,
  getAdminFromRequest,
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/adminAuth";
import { isSecureRequest, readJsonObject } from "@/lib/token";

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonObject(request);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const username =
      typeof body.username === "string" && body.username.trim()
        ? body.username.trim()
        : "admin";
    const password = typeof body.password === "string" ? body.password : "";

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
          error:
            verification.error || "Authentication failed. Invalid password.",
        },
        { status: 401 }
      );
    }

    const resolvedUsername = verification.username || username;
    const token = await createAdminToken(resolvedUsername);

    const response = NextResponse.json({
      success: true,
      message: "Admin authentication successful.",
      username: resolvedUsername,
      token,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecureRequest(request),
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
  const admin = await getAdminFromRequest(request);
  return NextResponse.json({
    authenticated: admin.authenticated,
    username: admin.username,
  });
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: "Admin logged out successfully.",
  });

  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
