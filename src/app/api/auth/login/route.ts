import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  createUserToken,
  USER_COOKIE_NAME,
  USER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/userAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { identifier, username, email, password } = body;
    const loginId = (identifier || username || email || "").trim();

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

    const token = createUserToken(authResult.user);

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: authResult.user,
      token,
    });

    response.cookies.set(USER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: USER_SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Login endpoint error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error during login." },
      { status: 500 }
    );
  }
}

