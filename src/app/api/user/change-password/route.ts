import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, createUserToken, userUnauthorizedResponse } from "@/lib/userAuth";

export async function POST(request: Request) {
  const userPayload = getUserFromRequest(request);
  if (!userPayload) {
    return userUnauthorizedResponse();
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword are required" },
        { status: 400 },
      );
    }

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId },
    });

    if (!user) {
      return userUnauthorizedResponse();
    }

    const currentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!currentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    // Truncate to whole seconds so the freshly-issued token (iat in whole seconds)
    // satisfies iat * 1000 >= forceLogoutAt, while older tokens are still rejected.
    const now = new Date(Math.floor(Date.now() / 1000) * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        forceLogoutAt: now,
      },
    });

    // Issue fresh token so current session stays valid
    const newToken = createUserToken(user.id, user.username);

    return NextResponse.json({ success: true, token: newToken });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 },
    );
  }
}
