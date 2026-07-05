import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth, unauthorizedResponse } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/userAuth";
import { normalizeAuthor } from "@/lib/authorFallback";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAdmin = checkAuth(request);
  const user = !isAdmin ? getUserFromRequest(request) : null;

  if (!isAdmin && !user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;

    if (isAdmin) {
      // Admin: hard delete
      await prisma.link.delete({ where: { id } });
    } else {
      // User: soft delete (recycle bin) — must own the link
      const link = await prisma.link.findUnique({ where: { id } });
      if (!link) return NextResponse.json({ error: "Link not found" }, { status: 404 });
      if (link.createdById !== user!.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await prisma.link.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting link:", error);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAdmin = checkAuth(request);
  const user = !isAdmin ? getUserFromRequest(request) : null;

  // Must be admin or authenticated user
  if (!isAdmin && !user) {
    return unauthorizedResponse();
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Get the link to check ownership
    const link = await prisma.link.findUnique({
      where: { id },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    // Users can only update their own links
    if (!isAdmin && link.createdById !== user?.userId) {
      return NextResponse.json(
        { error: "You can only edit your own links" },
        { status: 403 }
      );
    }

    // Cannot make a link public without a category
    if (body.isPublic === true) {
      const effectiveCategory = body.category !== undefined ? body.category : link.category;
      if (!effectiveCategory) {
        return NextResponse.json(
          { error: "A category is required to make a link public" },
          { status: 400 }
        );
      }
    }

    // Build update data based on permissions
    const updateData: {
      title?: string;
      url?: string;
      category?: string;
      description?: string | null;
      author?: string | null;
      publicationDay?: number | null;
      publicationMonth?: number | null;
      publicationYear?: number | null;
      boost?: number;
      isPublic?: boolean;
    } = {};

    // Fields that both users and admins can update
    if (body.title !== undefined) updateData.title = body.title;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.author !== undefined) {
      updateData.author = normalizeAuthor(body.author, body.url ?? link.url);
    } else if (body.url !== undefined) {
      updateData.author = normalizeAuthor(link.author, body.url);
    }
    if (body.publicationDay !== undefined) updateData.publicationDay = body.publicationDay;
    if (body.publicationMonth !== undefined) updateData.publicationMonth = body.publicationMonth;
    if (body.publicationYear !== undefined) updateData.publicationYear = body.publicationYear;

    // Admin-only fields
    if (isAdmin) {
      if (body.boost !== undefined) {
        const boost = parseFloat(body.boost);
        if (!isNaN(boost) && boost >= 0.1 && boost <= 10.0) {
          updateData.boost = boost;
        }
      }
    }

    const updatedLink = await prisma.link.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error("Error updating link:", error);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 },
    );
  }
}
