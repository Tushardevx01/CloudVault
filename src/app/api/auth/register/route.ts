import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/userAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Username, email, and password are required." },
        { status: 400 }
      );
    }

    const result = await registerUser({ username, email, password });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Registration failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful. You can now log in with your credentials.",
      user: result.user,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Register endpoint error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error during registration." },
      { status: 500 }
    );
  }
}

