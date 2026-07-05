import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, userUnauthorizedResponse } from "@/lib/userAuth";

async function canAccessLink(linkId: string, userId: string) {
  const link = await prisma.link.findFirst({
    where: {
      id: linkId,
      deletedAt: null,
      OR: [{ isPublic: true }, { createdById: userId }],
    },
    select: { id: true },
  });

  return Boolean(link);
}

export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) return userUnauthorizedResponse();

  try {
    const archives = await prisma.archivedLink.findMany({
      where: { userId: user.userId },
      orderBy: { archivedAt: "desc" },
      select: {
        linkId: true,
        archivedAt: true,
        link: {
          select: {
            id: true,
            title: true,
            url: true,
            category: true,
            author: true,
            description: true,
            timestamp: true,
            publicationDay: true,
            publicationMonth: true,
            publicationYear: true,
            isPublic: true,
            createdById: true,
          },
        },
      },
    });

    return NextResponse.json({ archives });
  } catch (error) {
    console.error("Error fetching archived links:", error);
    return NextResponse.json(
      { error: "Failed to fetch archived links" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) return userUnauthorizedResponse();

  try {
    const { linkId } = await request.json();
    if (!linkId || typeof linkId !== "string") {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    if (!(await canAccessLink(linkId, user.userId))) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const archive = await prisma.archivedLink.upsert({
      where: { linkId_userId: { linkId, userId: user.userId } },
      update: { archivedAt: new Date() },
      create: { linkId, userId: user.userId },
      select: { linkId: true, archivedAt: true },
    });

    return NextResponse.json({ success: true, archive });
  } catch (error) {
    console.error("Error archiving link:", error);
    return NextResponse.json(
      { error: "Failed to archive link" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) return userUnauthorizedResponse();

  try {
    const { linkId } = await request.json();
    if (!linkId || typeof linkId !== "string") {
      return NextResponse.json({ error: "linkId is required" }, { status: 400 });
    }

    const result = await prisma.archivedLink.deleteMany({
      where: { linkId, userId: user.userId },
    });

    return NextResponse.json({
      success: true,
      unarchived: result.count > 0,
    });
  } catch (error) {
    console.error("Error unarchiving link:", error);
    return NextResponse.json(
      { error: "Failed to unarchive link" },
      { status: 500 },
    );
  }
}
