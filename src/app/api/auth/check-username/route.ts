import { NextRequest, NextResponse } from "next/server";
import { getBloomFilter, RESERVED_USERNAMES } from "@/lib/bloomFilter";
import { getDb } from "@/lib/mongodb";
import { escapeRegExp } from "@/lib/utils";

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

    if (username.length < 3 || username.length > 32) {
      return NextResponse.json({
        success: true,
        available: false,
        method: "validation",
        hitsDb: false,
        message: "Username must be between 3 and 32 characters",
      });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return NextResponse.json({
        success: true,
        available: false,
        method: "validation",
        hitsDb: false,
        message:
          "Username can only contain letters, numbers, dots, underscores, and dashes",
      });
    }

    if ((RESERVED_USERNAMES as readonly string[]).includes(username)) {
      return NextResponse.json({
        success: true,
        username,
        available: false,
        method: "validation",
        hitsDb: false,
        message: "This username is reserved",
      });
    }

    // STEP 1: Check in-memory Bloom Filter (only authoritative when warmed from MongoDB)
    const bloom = await getBloomFilter();
    const isWarm = bloom.getIsInitialized();
    const mightContain = isWarm ? bloom.mightContain(username) : true;

    if (isWarm && !mightContain) {
      return NextResponse.json({
        success: true,
        username,
        available: true,
        method: "bloom_filter",
        hitsDb: false,
        message:
          "Username is available (guaranteed by Bloom Filter without querying database)",
        filterStats: bloom.getStats(),
      });
    }

    // STEP 2: Bloom Filter says probably present (or filter is cold) -> verify against MongoDB.
    const db = await getDb();
    const usersCollection = db.collection("users");
    const nameRegex = new RegExp(`^${escapeRegExp(username)}$`, "i");
    const existing = await usersCollection.findOne({
      $or: [{ username }, { name: { $regex: nameRegex } }],
    });

    if (existing) {
      bloom.add(username);
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

    return NextResponse.json({
      success: true,
      username,
      available: true,
      method: "database",
      hitsDb: true,
      falsePositive: isWarm,
      message: isWarm
        ? "Username is available (verified by database after Bloom collision check)"
        : "Username is available (verified directly against database)",
      filterStats: bloom.getStats(),
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Username check error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to check username availability",
      },
      { status: 500 }
    );
  }
}
