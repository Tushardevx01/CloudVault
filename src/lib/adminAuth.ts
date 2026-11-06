import { NextRequest } from "next/server";
import crypto from "crypto";

const ADMIN_SECRET =
  process.env.ADMIN_JWT_SECRET || "cloudvault_aditya_admin_secure_key_2026";
const COOKIE_NAME = "cloudvault_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export function createAdminToken(username: string = "admin"): string {
  const payload = {
    username,
    role: "admin",
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };
  const jsonPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(jsonPayload)
    .digest("base64url");
  return `${jsonPayload}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  if (!token || !token.includes(".")) return false;
  const [jsonPayload, signature] = token.split(".");
  if (!jsonPayload || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(jsonPayload)
    .digest("base64url");

  if (signature !== expectedSignature) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(jsonPayload, "base64url").toString("utf-8")
    );
    if (!payload.exp || Date.now() > payload.exp) {
      return false;
    }
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(request: NextRequest): boolean {
  // Check cookie
  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value && verifyAdminToken(cookie.value)) {
    return true;
  }

  // Check Authorization Bearer header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7).trim();
    if (verifyAdminToken(bearerToken)) {
      return true;
    }
  }

  return false;
}

export { COOKIE_NAME, SESSION_MAX_AGE_SECONDS };

