import crypto from "crypto";
import { getDb } from "./db";

const EPHEMERAL_FALLBACK_KEY = "__cloudvault_ephemeral_token_secrets__";
const SECRET_INFLIGHT_KEY = "__cloudvault_secret_promises__";

declare global {
  var __cloudvault_ephemeral_token_secrets__: Record<string, string> | undefined;
  var __cloudvault_secret_promises__: Record<string, Promise<string> | undefined> | undefined;
}

/**
 * Resolves a signing secret from environment variables, falling back to a
 * per-process CSPRNG secret (never a hardcoded static string) if unset.
 */
export function resolveSigningSecret(envVarName: string): string {
  const envSecret = process.env[envVarName]?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  if (!globalThis[EPHEMERAL_FALLBACK_KEY]) {
    globalThis[EPHEMERAL_FALLBACK_KEY] = {};
  }
  if (!globalThis[EPHEMERAL_FALLBACK_KEY][envVarName]) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[Security] ${envVarName} is not configured (or < 16 chars). Using an ephemeral runtime secret; sessions will invalidate on restart.`
      );
    }
    globalThis[EPHEMERAL_FALLBACK_KEY][envVarName] = crypto
      .randomBytes(32)
      .toString("hex");
  }

  return globalThis[EPHEMERAL_FALLBACK_KEY][envVarName];
}

/**
 * Resolves a signing secret from env, or shares a generated CSPRNG secret
 * via MongoDB across workers/restarts when the env variable is unset.
 */
export async function resolveSigningSecretAsync(
  envVarName: string
): Promise<string> {
  const envSecret = process.env[envVarName]?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  if (!globalThis[EPHEMERAL_FALLBACK_KEY]) {
    globalThis[EPHEMERAL_FALLBACK_KEY] = {};
  }
  const cached = globalThis[EPHEMERAL_FALLBACK_KEY][envVarName];
  if (cached) {
    return cached;
  }

  if (!globalThis[SECRET_INFLIGHT_KEY]) {
    globalThis[SECRET_INFLIGHT_KEY] = {};
  }

  if (!globalThis[SECRET_INFLIGHT_KEY][envVarName]) {
    globalThis[SECRET_INFLIGHT_KEY][envVarName] = (async () => {
      try {
        const db = await getDb();
        const secretsCol = db.collection<{ key: string; secret: string }>(
          "_system_secrets"
        );
        const generated = crypto.randomBytes(32).toString("hex");
        const result = await secretsCol.findOneAndUpdate(
          { key: envVarName },
          {
            $setOnInsert: {
              key: envVarName,
              secret: generated,
              createdAt: new Date(),
            },
          },
          { upsert: true, returnDocument: "after" }
        );
        const secret = result?.secret || generated;
        globalThis[EPHEMERAL_FALLBACK_KEY]![envVarName] = secret;
        return secret;
      } catch {
        return resolveSigningSecret(envVarName);
      } finally {
        if (globalThis[SECRET_INFLIGHT_KEY]) {
          delete globalThis[SECRET_INFLIGHT_KEY][envVarName];
        }
      }
    })();
  }

  return globalThis[SECRET_INFLIGHT_KEY][envVarName]!;
}

/**
 * Signs a JSON payload using HMAC-SHA256 with base64url encoding.
 */
export function signHmacToken(
  payload: Record<string, unknown>,
  secret: string,
  ttlSeconds: number
): string {
  const fullPayload = {
    ...payload,
    exp: Date.now() + ttlSeconds * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 token using constant-time signature comparison
 * and checks expiration.
 */
export function verifyHmacToken<T extends Record<string, unknown>>(
  token: string,
  secret: string
): T | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  const providedBuf = Buffer.from(providedSig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");

  if (
    providedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(providedBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    ) as T & { exp?: unknown };

    if (typeof payload.exp !== "number" || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts a Bearer token from the Authorization header if present.
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * Safely parses a JSON request body and guarantees a plain object (never null or array).
 */
export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Determines whether the incoming request arrived over HTTPS.
 */
export function isSecureRequest(request: Request): boolean {
  const protoHeader = request.headers.get("x-forwarded-proto");
  if (protoHeader) {
    return protoHeader.split(",")[0].trim().toLowerCase() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}
