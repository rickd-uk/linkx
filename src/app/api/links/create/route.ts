// src/app/api/links/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth, unauthorizedResponse } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/userAuth";
import { normalizeAuthor } from "@/lib/authorFallback";

export async function POST(request: Request) {
  // Check for admin auth first
  const isAdmin = checkAuth(request);

  // If not admin, check for user auth
  const user = !isAdmin ? getUserFromRequest(request) : null;

  // Must be either admin or authenticated user
  if (!isAdmin && !user) {
    return unauthorizedResponse();
  }

  try {
    const {
      title,
      url,
      description,
      category,
      author,
      publicationDay,
      publicationMonth,
      publicationYear,
      makePublic,
    } = await request.json();

    // Validate required fields
    if (!title || !url) {
      return NextResponse.json(
        { error: "Title and URL are required" },
        { status: 400 },
      );
    }

    // Uncategorized links are always private; public requires a category
    const isPublic = isAdmin
      ? Boolean(category)  // admin links with no category also stay private
      : Boolean(makePublic) && Boolean(category);

    const newLink = await prisma.link.create({
      data: {
        title,
        url,
        description: description || null,
        category: category || null,
        author: normalizeAuthor(author, url),
        timestamp: new Date(),
        publicationDay: publicationDay || null,
        publicationMonth: publicationMonth || null,
        publicationYear: publicationYear || null,
        isPublic,
        createdById: user?.userId || null,
      },
    });

    return NextResponse.json(newLink, { status: 201 });
  } catch (error) {
    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 },
    );
  }
}
