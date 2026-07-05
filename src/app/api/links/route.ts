import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateHotScore, DAILY_VOTE_BUDGET } from "@/lib/votingConfig";
import { getUserFromRequest } from "@/lib/userAuth";
import { checkAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "hot";
    const mine = searchParams.get("mine") === "true";
    const includePrivate = searchParams.get("includePrivate") === "true";

    const user = getUserFromRequest(request);

    // Build where clause
    let whereClause: Record<string, unknown> = {
      deletedAt: null,
      NOT: [
        { author: "__SYSTEM__" },
        { title: { startsWith: "__AUTHOR_PLACEHOLDER__" } },
        { title: { startsWith: "__PLACEHOLDER__" } },
      ],
    };

    if (mine) {
      if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      whereClause.createdById = user.userId;
    } else if (includePrivate) {
      if (!checkAuth(request)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    } else {
      if (user) {
        whereClause = {
          deletedAt: null,
          AND: [
            { NOT: [{ author: "__SYSTEM__" }, { title: { startsWith: "__AUTHOR_PLACEHOLDER__" } }, { title: { startsWith: "__PLACEHOLDER__" } }] },
            { OR: [{ isPublic: true }, { createdById: user.userId }] },
          ],
        };
      } else {
        whereClause.isPublic = true;
        whereClause.category = { not: null };
      }
    }

    // Run all DB queries in parallel
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [links, voteTotals, userVoteData, archivedData, categoryData] = await Promise.all([
      prisma.link.findMany({
        where: whereClause,
        select: {
          id: true, title: true, url: true, description: true, category: true,
          author: true, timestamp: true, publicationDay: true,
          publicationMonth: true, publicationYear: true,
          boost: true, isPublic: true, createdById: true,
          createdBy: { select: { username: true } },
        },
      }),
      prisma.vote.groupBy({ by: ["linkId"], _sum: { count: true } }),
      user
        ? prisma.vote.findMany({
            where: { userId: user.userId },
            select: { linkId: true, count: true, createdAt: true },
          })
        : Promise.resolve([]),
      user
        ? prisma.archivedLink.findMany({
            where: { userId: user.userId },
            select: { linkId: true, archivedAt: true },
          })
        : Promise.resolve([]),
      prisma.category.findMany({
        where: { isPublic: true },
        select: { name: true, icon: true },
      }),
    ]);

    // Build lookup maps
    const voteTotalMap = new Map(voteTotals.map((v) => [v.linkId, v._sum.count ?? 0]));
    const userVoteMap = new Map(userVoteData.map((v) => [v.linkId, v.count]));
    const archivedMap = new Map(archivedData.map((a) => [a.linkId, a.archivedAt]));

    // Remaining budget
    const todayUsed = userVoteData
      .filter((v) => new Date(v.createdAt) >= today)
      .reduce((sum, v) => sum + v.count, 0);
    const remainingBudget = Math.max(0, DAILY_VOTE_BUDGET - todayUsed);

    // Category icons
    const categoryIcons = Object.fromEntries(categoryData.map((c) => [c.name, c.icon]));

    // Build response
    const linksWithData = links.map((link) => {
      const totalVotes = voteTotalMap.get(link.id) ?? 0;
      return {
        id: link.id, title: link.title, url: link.url, description: link.description,
        category: link.category, author: link.author, timestamp: link.timestamp,
        publicationDay: link.publicationDay, publicationMonth: link.publicationMonth,
        publicationYear: link.publicationYear, boost: link.boost,
        isPublic: link.isPublic, createdById: link.createdById,
        submittedBy: link.createdBy?.username ?? null,
        archivedAt: archivedMap.get(link.id) ?? null,
        totalVotes,
        userVoteCount: userVoteMap.get(link.id) ?? 0,
        hotScore: calculateHotScore(totalVotes, link.boost, new Date(link.timestamp)),
      };
    });

    if (sort === "newest") {
      linksWithData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      linksWithData.sort((a, b) => b.hotScore - a.hotScore);
    }

    return NextResponse.json({
      links: linksWithData,
      categoryIcons,
      remainingBudget: user ? remainingBudget : null,
      userVotes: user ? Object.fromEntries(userVoteMap) : null,
      archivedLinks: user ? Object.fromEntries(archivedMap) : null,
    });
  } catch (error) {
    console.error("Failed to fetch links:", error);
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 });
  }
}
