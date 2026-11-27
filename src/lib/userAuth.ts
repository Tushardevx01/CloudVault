import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { getBloomFilter, RESERVED_USERNAMES } from "./bloomFilter";
import { escapeRegExp } from "./utils";
import {
  extractBearerToken,
  resolveSigningSecretAsync,
  signHmacToken,
  verifyHmacToken,
} from "./token";

export const USER_COOKIE_NAME = "cloudvault_user_session";
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  name: string;
}

interface UserTokenPayload extends AuthenticatedUser {
  role: string;
  exp: number;
  [key: string]: unknown;
}

async function getUserSecret(): Promise<string> {
  return resolveSigningSecretAsync("USER_JWT_SECRET");
}

export async function createUserToken(user: AuthenticatedUser): Promise<string> {
  return signHmacToken(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: "user",
    },
    await getUserSecret(),
    USER_SESSION_MAX_AGE_SECONDS
  );
}

/**
 * Verifies a user session token signature, expiration, and ensures the user
 * account still exists in MongoDB (invalidating sessions of deleted users).
 */
export async function verifyUserToken(
  token: string
): Promise<AuthenticatedUser | null> {
  const payload = verifyHmacToken<UserTokenPayload>(
    token,
    await getUserSecret()
  );
  if (!payload || payload.role !== "user") {
    return null;
  }
  if (typeof payload.id !== "string" || typeof payload.username !== "string") {
    return null;
  }

  try {
    const db = await getDb();
    const usersCollection = db.collection("users");
    const cleanUsername = payload.username.trim().toLowerCase();

    const query = ObjectId.isValid(payload.id)
      ? { _id: new ObjectId(payload.id) }
      : {
          $or: [
            { username: cleanUsername },
            {
              name: {
                $regex: new RegExp(`^${escapeRegExp(cleanUsername)}$`, "i"),
              },
            },
          ],
        };

    const userDoc = await usersCollection.findOne(query, {
      projection: { _id: 1, username: 1, email: 1, name: 1 },
    });

    if (!userDoc) {
      return null;
    }

    const resolvedUsername =
      (typeof userDoc.username === "string" && userDoc.username) ||
      payload.username;
    const resolvedName =
      (typeof userDoc.name === "string" && userDoc.name) || resolvedUsername;
    const resolvedEmail =
      (typeof userDoc.email === "string" && userDoc.email) ||
      (typeof payload.email === "string" ? payload.email : "");

    return {
      id: userDoc._id.toString(),
      username: resolvedUsername,
      email: resolvedEmail,
      name: resolvedName,
    };
  } catch (err) {
    console.warn("User session verification DB check failed:", err);
    return null;
  }
}

export async function getUserFromRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  const bearerToken = extractBearerToken(request);
  if (bearerToken) {
    return verifyUserToken(bearerToken);
  }

  const cookie = request.cookies.get(USER_COOKIE_NAME);
  if (cookie?.value) {
    return verifyUserToken(cookie.value);
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
}): Promise<{
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  conflict?: boolean;
}> {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 32) {
      return {
        success: false,
        error: "Username must be between 3 and 32 characters.",
      };
    }
    if (!USERNAME_REGEX.test(cleanUsername)) {
      return {
        success: false,
        error:
          "Username can only contain letters, numbers, dots, underscores, and dashes.",
      };
    }
    if ((RESERVED_USERNAMES as readonly string[]).includes(cleanUsername)) {
      return {
        success: false,
        conflict: true,
        error: "This username is reserved.",
      };
    }
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      return { success: false, error: "Please provide a valid email address." };
    }
    if (!password || password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters.",
      };
    }

    const db = await getDb();
    const usersCollection = db.collection("users");
    const nameRegex = new RegExp(`^${escapeRegExp(cleanUsername)}$`, "i");
    const emailRegex = new RegExp(`^${escapeRegExp(cleanEmail)}$`, "i");

    const existing = await usersCollection.findOne({
      $or: [
        { username: cleanUsername },
        { name: { $regex: nameRegex } },
        { email: { $regex: emailRegex } },
      ],
    });

    if (existing) {
      if (
        typeof existing.email === "string" &&
        existing.email.toLowerCase() === cleanEmail
      ) {
        return {
          success: false,
          conflict: true,
          error: "An account with this email already exists.",
        };
      }
      return {
        success: false,
        conflict: true,
        error: "This username is already taken.",
      };
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
    const error = err as { code?: number; message?: string };
    if (error.code === 11000) {
      return {
        success: false,
        conflict: true,
        error: "An account with this username or email already exists.",
      };
    }
    console.error("User registration error:", error);
    return {
      success: false,
      error: error.message || "Failed to register user.",
    };
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
      return {
        success: false,
        error: "Username/email and password are required.",
      };
    }

    const db = await getDb();
    const usersCollection = db.collection("users");
    const idRegex = new RegExp(`^${escapeRegExp(cleanId)}$`, "i");

    const user = await usersCollection.findOne({
      $or: [
        { username: cleanId },
        { name: { $regex: idRegex } },
        { email: { $regex: idRegex } },
      ],
    });

    if (!user) {
      return { success: false, error: "Invalid username or password." };
    }

    if (!user.passwordHash) {
      return {
        success: false,
        error:
          "This account was created without a password. Please sign up or contact an administrator.",
      };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: "Invalid username or password." };
    }

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
    return {
      success: false,
      error: error.message || "Database authentication error.",
    };
  }
}
