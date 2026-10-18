import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { error: "Invalid master password" },
        { status: 401 }
      );
    }

    const session = await getSession();
    session.isAuthenticated = true;
    session.loginTime = new Date().toISOString();
    await session.save();

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
