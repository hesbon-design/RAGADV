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

    const departments = await sql`
      SELECT 
        d.id,
        d.name,
        d.slug,
        d.default_rule_profile_id,
        d.created_at,
        COUNT(r.id)::int as report_count
      FROM departments d
      LEFT JOIN reports r ON d.id = r.department_id AND r.deleted_at IS NULL
      GROUP BY d.id, d.name, d.slug, d.default_rule_profile_id, d.created_at
      ORDER BY d.created_at ASC
    `;

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("Failed to list departments:", error);
    return NextResponse.json(
      { error: "Internal server error fetching departments" },
      { status: 500 }
    );
  }
}
