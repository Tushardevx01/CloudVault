import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  createUserToken,
  USER_COOKIE_NAME,
  USER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/userAuth";
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

    const rawId = body.identifier ?? body.username ?? body.email;
    const loginId = typeof rawId === "string" ? rawId.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!loginId || !password) {
      return NextResponse.json(
        { success: false, error: "Username/email and password are required." },
        { status: 400 }
      );
    }

    const authResult = await authenticateUser({
      identifier: loginId,
      password,
    });

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Invalid credentials." },
        { status: 401 }
      );
    }

    const token = await createUserToken(authResult.user);

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: authResult.user,
      token,
    });

    response.cookies.set(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      maxAge: USER_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Login endpoint error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error during login.",
      },
      { status: 500 }
    );
  }
}
