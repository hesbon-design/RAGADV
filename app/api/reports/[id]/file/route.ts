import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { sql, initDatabase } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await initDatabase();

    const { id } = await params;

    const reports = await sql`
      SELECT filename, storage_path 
      FROM reports 
      WHERE id = ${id} AND deleted_at IS NULL
    `;

    if (reports.length === 0 || !fs.existsSync(reports[0].storage_path)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const report = reports[0];
    const fileBuffer = await fs.promises.readFile(report.storage_path);
    const ext = path.extname(report.filename).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".txt" || ext === ".md") {
      contentType = "text/plain; charset=utf-8";
    } else if (ext === ".docx") {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(report.filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Failed to serve report file:", error);
    return NextResponse.json(
      { error: "Internal server error reading document" },
      { status: 500 }
    );
  }
}
