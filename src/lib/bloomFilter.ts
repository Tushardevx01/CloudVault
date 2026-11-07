import { getDb } from "./mongodb";

// 131,072 bits = 16 KB of RAM (negligible memory footprint, handles tens of thousands of usernames at <0.5% FPR)
const DEFAULT_BIT_SIZE = 131072;
const HASH_COUNT_K = 7;

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export class BloomFilter {
  private size: number;
  private hashCount: number;
  private bitArray: Uint8Array;
  private insertedCount: number = 0;
  private isInitialized: boolean = false;

  constructor(size: number = DEFAULT_BIT_SIZE, hashCount: number = HASH_COUNT_K) {
    this.size = size;
    this.hashCount = hashCount;
    this.bitArray = new Uint8Array(Math.ceil(size / 8));
  }

  /**
   * Generates k bit indices using Kirsch-Mitzenmacher optimization (double hashing).
   * index_i = (h1 + i * h2) % size
   */
  private getIndices(item: string): number[] {
    const normalized = item.trim().toLowerCase();
    const h1 = fnv1a(normalized);
    let h2 = djb2(normalized);
    if (h2 === 0) h2 = 1; // ensure non-zero step

    const indices: number[] = [];
    for (let i = 0; i < this.hashCount; i++) {
      const combined = (h1 + Math.imul(i, h2)) >>> 0;
      indices.push(combined % this.size);
    }
    return indices;
  }

  /**
   * Adds a username into the Bloom filter bit array.
   */
  public add(item: string): void {
    if (!item) return;
    const indices = this.getIndices(item);
    for (const idx of indices) {
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = idx % 8;
      this.bitArray[byteIdx] |= 1 << bitOffset;
    }
    this.insertedCount++;
  }

  /**
   * Checks if an item might be in the set.
   * Returns false -> DEFINITELY NOT in the set (guaranteed available, 0 DB read).
   * Returns true  -> PROBABLY in the set (must query DB to resolve false positives).
   */
  public mightContain(item: string): boolean {
    if (!item) return false;
    const indices = this.getIndices(item);
    for (const idx of indices) {
      const byteIdx = Math.floor(idx / 8);
      const bitOffset = idx % 8;
      if ((this.bitArray[byteIdx] & (1 << bitOffset)) === 0) {
        return false; // guaranteed not present
      }
    }
    return true; // probably present
  }

  public getStats() {
    return {
      bitSize: this.size,
      memoryBytes: this.bitArray.length,
      hashCount: this.hashCount,
      insertedCount: this.insertedCount,
      isInitialized: this.isInitialized,
    };
  }

  public setInitialized(val: boolean) {
    this.isInitialized = val;
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

declare global {
  var _globalBloomFilter: BloomFilter | undefined;
}

/**
 * Returns the singleton BloomFilter, lazily warmed from MongoDB.
 */
export async function getBloomFilter(): Promise<BloomFilter> {
  if (!globalThis._globalBloomFilter) {
    globalThis._globalBloomFilter = new BloomFilter();
  }

  const filter = globalThis._globalBloomFilter;

  if (!filter.getIsInitialized()) {
    try {
      const db = await getDb();
      const usersCollection = db.collection("users");
      // Load all existing usernames/names into the bloom filter
      const users = await usersCollection
        .find({}, { projection: { name: 1, username: 1 } })
        .toArray();

      for (const u of users) {
        if (u.username) filter.add(u.username);
        if (u.name) filter.add(u.name);
      }

      // Also reserve default administrative / system namespaces
      filter.add("admin");
      filter.add("administrator");
      filter.add("root");
      filter.add("system");
      filter.add("cloudvault");

      filter.setInitialized(true);
    } catch (err) {
      console.warn("Could not warm Bloom filter from MongoDB:", err);
    }
  }

  return filter;
}
