import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, initDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDatabase();

    const tokenRows = await sql`
      SELECT 
        COALESCE(SUM(input_tokens + output_tokens), 0)::int as total_tokens
      FROM scorecards
      WHERE deleted_at IS NULL
    `;

    const totalTokens = tokenRows[0]?.total_tokens ?? 0;
    const monthlyLimit = 500000;
    const percentage = Number(((totalTokens / monthlyLimit) * 100).toFixed(1));

    return NextResponse.json({
      totalTokens,
      monthlyLimit,
      percentage,
    });
  } catch (error) {
    console.error("Failed to fetch telemetry:", error);
    return NextResponse.json(
      { error: "Internal server error fetching telemetry" },
      { status: 500 }
    );
  }
}
