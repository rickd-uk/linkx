import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { checkAuth, unauthorizedResponse } from "@/lib/auth";

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    // Verify current password (DB hash takes precedence over env var)
    const hashSetting = await prisma.setting.findUnique({
      where: { key: "admin_password_hash" },
    });

    let currentPasswordValid: boolean;
    if (hashSetting) {
      currentPasswordValid = await bcrypt.compare(currentPassword, hashSetting.value);
    } else {
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
      if (!ADMIN_PASSWORD) {
        console.error("No admin password configured (no DB hash and ADMIN_PASSWORD not set)!");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      currentPasswordValid = currentPassword === ADMIN_PASSWORD;
    }

    if (!currentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    // Hash and store new password
    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.setting.upsert({
      where: { key: "admin_password_hash" },
      update: { value: newHash },
      create: { key: "admin_password_hash", value: newHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 },
    );
  }
}
