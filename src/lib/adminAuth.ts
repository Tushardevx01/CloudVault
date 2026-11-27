import { NextRequest } from "next/server";
import {
  extractBearerToken,
  resolveSigningSecretAsync,
  signHmacToken,
  verifyHmacToken,
} from "./token";

export const COOKIE_NAME = "cloudvault_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

interface AdminTokenPayload {
  username: string;
  role: string;
  exp: number;
  [key: string]: unknown;
}

async function getAdminSecret(): Promise<string> {
  return resolveSigningSecretAsync("ADMIN_JWT_SECRET");
}

export async function createAdminToken(
  username: string = "admin"
): Promise<string> {
  return signHmacToken(
    { username, role: "admin" },
    await getAdminSecret(),
    SESSION_MAX_AGE_SECONDS
  );
}

export async function verifyAdminTokenPayload(
  token: string
): Promise<{ username: string } | null> {
  const payload = verifyHmacToken<AdminTokenPayload>(
    token,
    await getAdminSecret()
  );
  if (!payload || payload.role !== "admin") {
    return null;
  }
  return {
    username:
      typeof payload.username === "string" && payload.username
        ? payload.username
        : "admin",
  };
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  return (await verifyAdminTokenPayload(token)) !== null;
}

export async function getAdminFromRequest(
  request: NextRequest
): Promise<{ authenticated: boolean; username: string | null }> {
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    const admin = await verifyAdminTokenPayload(bearerToken);
    if (admin) {
      return { authenticated: true, username: admin.username };
    }
    return { authenticated: false, username: null };
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value) {
    const admin = await verifyAdminTokenPayload(cookie.value);
    if (admin) {
      return { authenticated: true, username: admin.username };
    }
  }

  return { authenticated: false, username: null };
}

export async function isAdminAuthenticated(
  request: NextRequest
): Promise<boolean> {
  return (await getAdminFromRequest(request)).authenticated;
}
