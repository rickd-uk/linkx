import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_USERNAME) {
      console.error("ADMIN_USERNAME environment variable not set!");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    if (username !== ADMIN_USERNAME) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check DB hash first, fall back to env var
    const hashSetting = await prisma.setting.findUnique({
      where: { key: "admin_password_hash" },
    });

    if (!hashSetting && !ADMIN_PASSWORD) {
      console.error("No admin password configured (no DB hash and ADMIN_PASSWORD not set)!");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let passwordValid: boolean;
    if (hashSetting) {
      passwordValid = await bcrypt.compare(password, hashSetting.value);
    } else {
      passwordValid = password === ADMIN_PASSWORD;
    }

    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
    return NextResponse.json({ success: true, token, message: "Login successful" });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
