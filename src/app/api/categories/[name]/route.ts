import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth, unauthorizedResponse } from "@/lib/auth";

// Update a category (rename and/or change icon)
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
    const { newName, icon } = body;

    // Find category in Category model
    const existingCategory = await prisma.category.findUnique({
      where: { name: decodedName },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    const updateData: { name?: string; icon?: string } = {};
    if (newName && newName.trim() && newName.trim() !== decodedName) {
      updateData.name = newName.trim();
    }
    if (icon !== undefined) {
      updateData.icon = icon.trim() || "📁";
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        success: true,
        message: "No changes made",
        updatedCount: 0,
      });
    }

    // Update category in Category model
    await prisma.category.update({
      where: { name: decodedName },
      data: updateData,
    });

    // If name changed, update all links with the old category name
    let linksUpdated = 0;
    if (updateData.name) {
      const result = await prisma.link.updateMany({
        where: { category: decodedName },
        data: { category: updateData.name },
      });
      linksUpdated = result.count;
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      updatedCount: linksUpdated,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

// Delete a category
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

    // Delete from Category model
    await prisma.category.delete({
      where: { name: decodedName },
    }).catch(() => {
      // Category might not exist in model (legacy)
    });

    if (deleteLinks === true) {
      // Delete all links with this category
      const result = await prisma.link.deleteMany({
        where: {
          category: decodedName,
        },
      });
      return NextResponse.json({
        success: true,
        message: "Category and associated links deleted",
        deletedLinksCount: result.count,
      });
    } else {
      // Delete placeholder links for this category
      await prisma.link.deleteMany({
        where: {
          category: decodedName,
          author: "__SYSTEM__",
          title: { startsWith: "__PLACEHOLDER__" },
        },
      });

      // Remove category from real links only. Uncategorized links are private.
      const result = await prisma.link.updateMany({
        where: {
          category: decodedName,
          NOT: {
            author: "__SYSTEM__",
          },
        },
        data: {
          category: null,
          isPublic: false,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Category removed, links set to no category",
        updatedLinksCount: result.count,
      });
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
