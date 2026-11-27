import { NextRequest, NextResponse } from "next/server";
import { AuthenticatedUser, getUserFromRequest } from "./userAuth";
import { getAdminFromRequest } from "./adminAuth";
import { isValidUploadKey } from "./utils";

export type CallerAuthResult =
  | {
      authorized: true;
      isAdmin: boolean;
      adminUsername: string | null;
      user: AuthenticatedUser | null;
    }
  | {
      authorized: false;
      response: NextResponse;
    };

/**
 * Ensures the request has a valid user or admin session.
 */
export async function requireAuthenticatedCaller(
  request: NextRequest,
  message: string = "Authentication required."
): Promise<CallerAuthResult> {
  const [admin, user] = await Promise.all([
    getAdminFromRequest(request),
    getUserFromRequest(request),
  ]);

  if (!admin.authenticated && !user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: message },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    isAdmin: admin.authenticated,
    adminUsername: admin.username,
    user,
  };
}

/**
 * Ensures the request has a valid admin session.
 */
export async function requireAdminCaller(
  request: NextRequest
): Promise<
  | { authorized: true; username: string }
  | { authorized: false; response: NextResponse }
> {
  const admin = await getAdminFromRequest(request);
  if (!admin.authenticated) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized. Admin session required." },
        { status: 401 }
      ),
    };
  }
  return { authorized: true, username: admin.username || "admin" };
}

/**
 * Checks whether a file's owner matches the authenticated user's username or display name.
 */
export function isCallerFileOwner(
  uploadedBy: string | undefined | null,
  user: AuthenticatedUser | null
): boolean {
  if (!user || !uploadedBy) return false;
  const owner = uploadedBy.trim().toLowerCase();
  if (!owner || owner === "unassigned") return false;
  return (
    owner === user.username.trim().toLowerCase() ||
    owner === user.name.trim().toLowerCase()
  );
}

/**
 * Extracts and validates the `key` query parameter for S3 object endpoints.
 */
export function parseValidatedKeyParam(
  request: NextRequest
): { valid: true; key: string } | { valid: false; response: NextResponse } {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: "Missing required query parameter: key" },
        { status: 400 }
      ),
    };
  }

  if (!isValidUploadKey(key)) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: "Invalid object key or unauthorized path." },
        { status: 400 }
      ),
    };
  }

  return { valid: true, key };
}
