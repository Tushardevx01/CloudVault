import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, USER_COOKIE_NAME } from "@/lib/userAuth";
import { isSecureRequest } from "@/lib/token";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (!user) {
    const response = NextResponse.json({
      authenticated: false,
      user: null,
    });
    if (request.cookies.get(USER_COOKIE_NAME)?.value) {
      response.cookies.set(USER_COOKIE_NAME, "", {
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
    }
    return response;
  }

  return NextResponse.json({
    authenticated: true,
    user,
  });
}
