import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";
import { getBloomFilter } from "./bloomFilter";

const USER_SESSION_SECRET =
  process.env.USER_JWT_SECRET || "cloudvault_user_secure_token_secret_2026";
export const USER_COOKIE_NAME = "cloudvault_user_session";
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  name: string;
}

export function createUserToken(user: AuthenticatedUser): string {
  const payload = {
    ...user,
    role: "user",
    exp: Date.now() + USER_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const jsonPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", USER_SESSION_SECRET)
    .update(jsonPayload)
    .digest("base64url");
  return `${jsonPayload}.${signature}`;
}

export function verifyUserToken(token: string): AuthenticatedUser | null {
  if (!token || !token.includes(".")) return null;
  const [jsonPayload, signature] = token.split(".");
  if (!jsonPayload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", USER_SESSION_SECRET)
    .update(jsonPayload)
    .digest("base64url");

  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(jsonPayload, "base64url").toString("utf-8")
    );
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      name: payload.name || payload.username,
    };
  } catch {
    return null;
  }
}

export function getUserFromRequest(request: NextRequest): AuthenticatedUser | null {
  const cookie = request.cookies.get(USER_COOKIE_NAME);
  if (cookie?.value) {
    const user = verifyUserToken(cookie.value);
    if (user) return user;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    return verifyUserToken(token);
  }

  return null;
}

/**
 * Register a new user in MongoDB and update the in-memory Bloom filter.
 */
export async function registerUser({
  username,
  email,
  password,
}: {
  username: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: "Username must be at least 3 characters." };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return {
        success: false,
        error: "Username can only contain letters, numbers, underscores, and dashes.",
      };
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Please provide a valid email address." };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    // Double check availability against database
    const existing = await usersCollection.findOne({
      $or: [
        { username: cleanUsername },
        { name: cleanUsername },
        { email: cleanEmail },
      ],
    });

    if (existing) {
      if (existing.email === cleanEmail) {
        return { success: false, error: "An account with this email already exists." };
      }
      return { success: false, error: "This username is already taken." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    const result = await usersCollection.insertOne({
      username: cleanUsername,
      name: cleanUsername,
      email: cleanEmail,
      passwordHash,
      role: "user",
      createdAt: now,
      updatedAt: now,
      objectCount: 0,
      totalSizeBytes: 0,
    });

    // Add to in-memory Bloom Filter immediately
    const bloom = await getBloomFilter();
    bloom.add(cleanUsername);

    return {
      success: true,
      user: {
        id: result.insertedId.toString(),
        username: cleanUsername,
        email: cleanEmail,
        name: cleanUsername,
      },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("User registration error:", error);
    return { success: false, error: error.message || "Failed to register user." };
  }
}

/**
 * Authenticate a user by username or email.
 */
export async function authenticateUser({
  identifier,
  password,
}: {
  identifier: string;
  password: string;
}): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
  try {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId || !password) {
      return { success: false, error: "Username/email and password are required." };
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({
      $or: [
        { username: cleanId },
        { name: cleanId },
        { email: cleanId },
      ],
    });

    if (!user) {
      return { success: false, error: "Invalid username or password." };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        error: "This account was created without a password. Please sign up or reset password.",
      };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Invalid username or password." };
    }

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { lastActiveAt: new Date() } }
    );

    return {
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username || user.name,
        email: user.email || `${user.name}@cloudvault.internal`,
        name: user.name || user.username,
      },
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("User login error:", error);
    return { success: false, error: error.message || "Database authentication error." };
  }
}

