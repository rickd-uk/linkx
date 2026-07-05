// src/app/api/authors/[name]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth, unauthorizedResponse } from "@/lib/auth";
import { normalizeAuthor } from "@/lib/authorFallback";

// Rename an author
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const body = await request.json();
    const { newName } = body;

    if (!newName || typeof newName !== "string" || !newName.trim()) {
      return NextResponse.json(
        { error: "New author name is required" },
        { status: 400 },
      );
    }

    const existingLinks = await prisma.link.findMany({
      where: { author: decodedName },
    });

    if (existingLinks.length === 0) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    const result = await prisma.link.updateMany({
      where: { author: decodedName },
      data: { author: newName.trim() },
    });

    return NextResponse.json({
      success: true,
      message: "Author renamed successfully",
      updatedCount: result.count,
    });
  } catch (error) {
    console.error("Error renaming author:", error);
    return NextResponse.json(
      { error: "Failed to rename author" },
      { status: 500 },
    );
  }
}

// Delete an author
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const body = await request.json();
    const { deleteLinks } = body;

    if (deleteLinks === true) {
      // Delete all links by this author (excluding placeholders)
      const result = await prisma.link.deleteMany({
        where: { author: decodedName },
      });

      return NextResponse.json({
        success: true,
        message: "Author and associated links deleted",
        deletedLinksCount: result.count,
      });
    } else {
      // Delete placeholder links for this author
      await prisma.link.deleteMany({
        where: {
          author: decodedName,
          title: { startsWith: "__AUTHOR_PLACEHOLDER__" },
        },
      });

      const links = await prisma.link.findMany({
        where: {
          author: decodedName,
          NOT: { title: { startsWith: "__AUTHOR_PLACEHOLDER__" } },
        },
        select: { id: true, url: true },
      });

      let updatedLinksCount = 0;
      for (const link of links) {
        await prisma.link.update({
          where: { id: link.id },
          data: { author: normalizeAuthor(null, link.url) },
        });
        updatedLinksCount++;
      }

      return NextResponse.json({
        success: true,
        message: "Author removed, links set to URL hostname",
        updatedLinksCount,
      });
    }
  } catch (error) {
    console.error("Error deleting author:", error);
    return NextResponse.json(
      { error: "Failed to delete author" },
      { status: 500 },
    );
  }
}
