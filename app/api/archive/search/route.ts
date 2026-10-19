import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { initDatabase } from "@/lib/db";
import { hybridSearch } from "@/lib/search";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDatabase();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { query, departmentId, docType, limit } = body || {};

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { error: "Query parameter is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const parsedLimit = limit
      ? Math.min(Math.max(1, parseInt(String(limit), 10) || 5), 50)
      : 5;

    const validDocType = ["all", "raw", "reflection", "summary"].includes(docType)
      ? docType
      : undefined;

    const results = await hybridSearch({
      query: query.trim(),
      departmentId: departmentId && typeof departmentId === "string" ? departmentId.trim() : undefined,
      docType: validDocType,
      limit: parsedLimit,
    });

    return NextResponse.json({
      success: true,
      query: query.trim(),
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Hybrid search error:", error);
    return NextResponse.json(
      { error: "Internal server error during archive search" },
      { status: 500 }
    );
  }
}
