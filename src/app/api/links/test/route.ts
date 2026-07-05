import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';
import { normalizeAuthor } from '@/lib/authorFallback';

interface CSVLink {
    title: string;
    url: string;
    category: string;
    description? : string;
    author?: string;
    timestamp: string;
}

export async function GET() {
    try {
        // Read the test CSV file
        const csvPath = path.join(process.cwd(), 'public', 'test.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        
        // Parse CSV
        const parseResult = Papa.parse<CSVLink>(csvContent, {
            header: true,
            skipEmptyLines: true,
        });

        if (parseResult.errors.length > 0) {
            return NextResponse.json(
                { error: 'CSV parsing failed', details: parseResult.errors },
                { status: 400 }
            );
        }

        const links = parseResult.data;
        let inserted = 0;

        // Process links
        for (const link of links) {
            await prisma.link.create({
                data: {
                    title: link.title,
                    url: link.url,
                    category: link.category,
                    description: link.description?.trim(), 
                    author: normalizeAuthor(link.author, link.url),
                    timestamp: new Date(),
                }
            });
            inserted++;
        }

        return NextResponse.json({ 
            success: true,
            message: `Successfully added ${inserted} links`,
            links: links
        });

    } catch (error) {
        console.error('Test upload error:', error);
        return NextResponse.json(
            { 
                error: 'Failed to process test upload',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
