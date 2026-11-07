import { NextRequest, NextResponse } from "next/server";
import { getBloomFilter } from "@/lib/bloomFilter";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username")?.trim().toLowerCase();

    if (!username) {
      return NextResponse.json(
        { success: false, error: "Username parameter is required" },
        { status: 400 }
      );
    }

    // Format validation
    if (username.length < 3) {
      return NextResponse.json({
        success: true,
        available: false,
        method: "validation",
        hitsDb: false,
        message: "Username must be at least 3 characters",
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return NextResponse.json({
        success: true,
        available: false,
        method: "validation",
        hitsDb: false,
        message: "Username can only contain letters, numbers, underscores, and dashes",
      });
    }

    // STEP 1: Check in-memory Bloom Filter (Probabilistic Layer)
    const bloom = await getBloomFilter();
    const mightContain = bloom.mightContain(username);

    // If Bloom Filter says NO -> GUARANTEED NOT IN SET (0 DB READS!)
    if (!mightContain) {
      return NextResponse.json({
        success: true,
        username,
        available: true,
        method: "bloom_filter",
        hitsDb: false,
        message: "Username is available (guaranteed by Bloom Filter without querying database)",
        filterStats: bloom.getStats(),
      });
    }

    // STEP 2: Bloom Filter says YES -> Probably taken (or false positive).
    // Verify against MongoDB to eliminate false positives.
    const db = await getDb();
    const usersCollection = db.collection("users");
    const existing = await usersCollection.findOne({
      $or: [{ username }, { name: username }],
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        username,
        available: false,
        method: "database",
        hitsDb: true,
        message: "Username is already taken",
        filterStats: bloom.getStats(),
      });
    }

    // Bloom Filter false positive, but MongoDB confirmed free
    return NextResponse.json({
      success: true,
      username,
      available: true,
      method: "database",
      hitsDb: true,
      falsePositive: true,
      message: "Username is available (verified by database after Bloom collision check)",
      filterStats: bloom.getStats(),
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Username check error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to check username availability" },
      { status: 500 }
    );
  }
}

