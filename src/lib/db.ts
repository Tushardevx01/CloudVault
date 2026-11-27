import { MongoClient, Db } from "mongodb";

const DB_NAME = "cloudvault";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoIndexesReady: Promise<void> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function connectClient(uri: string, onReset: () => void): Promise<MongoClient> {
  const client = new MongoClient(uri);
  return client.connect().catch((err) => {
    onReset();
    throw err;
  });
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is not defined. Please configure it in .env."
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = connectClient(uri, () => {
        global._mongoClientPromise = undefined;
      });
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = connectClient(uri, () => {
      clientPromise = undefined;
    });
  }
  return clientPromise;
}

async function ensureIndexes(db: Db): Promise<void> {
  if (!global._mongoIndexesReady) {
    global._mongoIndexesReady = (async () => {
      try {
        await Promise.all([
          db
            .collection("files")
            .createIndex({ key: 1 }, { unique: true, background: true }),
          db
            .collection("files")
            .createIndex({ uploadedBy: 1, uploadedAt: -1 }, { background: true }),
          db
            .collection("users")
            .createIndex(
              { username: 1 },
              {
                unique: true,
                partialFilterExpression: { username: { $type: "string" } },
                background: true,
              }
            ),
          db
            .collection("users")
            .createIndex(
              { email: 1 },
              {
                unique: true,
                partialFilterExpression: { email: { $type: "string" } },
                background: true,
              }
            ),
          db
            .collection("admins")
            .createIndex({ username: 1 }, { unique: true, background: true }),
          db
            .collection("_system_secrets")
            .createIndex({ key: 1 }, { unique: true, background: true }),
        ]);
      } catch (err) {
        // Reset cached promise so transient failures can retry on subsequent calls
        global._mongoIndexesReady = undefined;
        console.warn("MongoDB index creation warning:", err);
      }
    })();
  }
  return global._mongoIndexesReady;
}

/**
 * Returns the MongoDB Database instance and ensures collection indexes exist.
 */
export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

/**
 * Verifies live MongoDB connectivity for health diagnostics.
 */
export async function pingDatabase(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
