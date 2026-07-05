import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { checkAuth, unauthorizedResponse } from "@/lib/auth";
import { normalizeAuthor } from "@/lib/authorFallback";

// Define required CSV fields
interface CSVLink {
  title: string;
  url: string;
  category: string;
  description?: string;
  author?: string;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // CHECK AUTHENTICATION FIRST!
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No CSV file provided" },
        { status: 400 },
      );
    }

    // Read the file content
    const csvText = await file.text();
    console.log("CSV Content preview:", csvText.substring(0, 100));

    // Parse CSV
    const parseResult = Papa.parse<CSVLink>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      console.error("Parse errors:", parseResult.errors);
      return NextResponse.json(
        { error: "CSV parsing failed", details: parseResult.errors },
        { status: 400 },
      );
    }

    const links = parseResult.data;
    console.log("Parsed links:", links.length);

    // Validate required fields
    const invalidStories = links.filter((link) => {
      return !link.title || !link.url || !link.category;
    });

    if (invalidStories.length > 0) {
      console.log("Invalid links:", invalidStories);
      return NextResponse.json(
        {
          error: "Invalid data in CSV",
          details:
            "Some links are missing required fields (title, url, category)",
        },
        { status: 400 },
      );
    }

    // Insert links into the database
    let inserted = 0;
    for (const link of links) {
      try {
        await prisma.link.create({
          data: {
            title: link.title.trim(),
            url: link.url.trim(),
            category: link.category.trim(),
            description: link.description?.trim() || "No description provided",
            author: normalizeAuthor(link.author, link.url),
            timestamp: new Date(), // Default to current date/time
          },
        });
        inserted++;
      } catch (err) {
        console.error("Error inserting link:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${inserted} links out of ${links.length} total`,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process bulk upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
