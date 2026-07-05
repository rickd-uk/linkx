import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth, unauthorizedResponse } from "@/lib/auth";
import { normalizeAuthor } from "@/lib/authorFallback";

// interface CSVRow {
//   title: string;
//   url: string;
//   category: string;
//   description?: string;
//   author?: string;
// }
//
interface UploadResult {
  success: boolean;
  title: string;
  message: string;
}

export async function POST(request: Request) {
  // CHECK AUTH FIRST!
  if (!checkAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await request.json();
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "CSV content is required" },
        { status: 400 },
      );
    }

    // Parse CSV with semicolon separator
    const lines = csvContent.trim().split("\n");

    if (lines.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    const results: UploadResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let startIndex = 0;

    // Check if first line is a header (contains "title")
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes("title") && firstLine.includes("url")) {
      startIndex = 1; // Skip header row
    }

    // Process each line
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        continue;
      }

      try {
        // Parse CSV line with semicolon separator
        const columns = line.split(";").map((col) => col.trim());

        // Validate minimum required fields
        if (columns.length < 3) {
          results.push({
            success: false,
            title: columns[0] || `Row ${i + 1}`,
            message:
              "Missing required fields (need at least: title, url, category)",
          });
          failureCount++;
          continue;
        }

        const [title, url, category, description = "", author = ""] = columns;

        // Validate required fields
        if (!title) {
          results.push({
            success: false,
            title: `Row ${i + 1}`,
            message: "Title is required",
          });
          failureCount++;
          continue;
        }

        if (!url) {
          results.push({
            success: false,
            title: title,
            message: "URL is required",
          });
          failureCount++;
          continue;
        }

        if (!category) {
          results.push({
            success: false,
            title: title,
            message: "Category is required",
          });
          failureCount++;
          continue;
        }

        // Validate URL format
        try {
          new URL(url);
        } catch {
          results.push({
            success: false,
            title: title,
            message: "Invalid URL format",
          });
          failureCount++;
          continue;
        }

        // Create link in database
        await prisma.link.create({
          data: {
            title: title,
            url: url,
            category: category,
            description: description || null,
            author: normalizeAuthor(author, url),
            timestamp: new Date(),
          },
        });

        results.push({
          success: true,
          title: title,
          message: "Successfully added",
        });
        successCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        results.push({
          success: false,
          title: `Row ${i + 1}`,
          message: `Failed to add: ${errorMessage}`,
        });
        failureCount++;
      }
    }

    return NextResponse.json({
      results,
      successCount,
      failureCount,
      totalProcessed: successCount + failureCount,
    });
  } catch (error) {
    console.error("Error processing CSV:", error);
    return NextResponse.json(
      {
        error: "Failed to process CSV file",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
