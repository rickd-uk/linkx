// src/components/LinkX.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import Image from "next/image";
import { Raleway } from "next/font/google";
import { Archive } from "lucide-react";

const raleway = Raleway({ subsets: ["latin"], weight: "700", style: "italic", display: "swap" });
import UserMenu from "./UserMenu";
import VoteButton from "./VoteButton";
import UserSubmitLinkModal from "./UserSubmitLinkModal";
import RecycleBinModal from "./RecycleBinModal";
import { useAuth } from "@/hooks/useAuth";
import { useVoting } from "@/hooks/useVoting";

interface Link {
  id: string;
  title: string;
  url: string;
  category: string | null;
  author: string | null;
  description: string | null;
  publicationDay?: number | null;
  publicationMonth?: number | null;
  publicationYear?: number | null;
  timestamp: string;
  totalVotes: number;
  hotScore: number;
  boost: number;
  isPublic: boolean;
  createdById: string | null;
  submittedBy: string | null;
  archivedAt: string | null;
}

const LINKS_PER_PAGE = 20;

const linkUrlKey = (url: string) => {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
    return parsed.toString();
  } catch {
    return url.trim().toLowerCase();
  }
};

const dedupeLinksByUrl = (links: Link[]) => {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = linkUrlKey(link.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Outside component — stable reference, no closure dependencies
const fmtDate = (d: Date) => {
  const now = new Date();
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "2-digit" } : {}),
  });
};

const formatPubDate = (link: Link): string | null => {
  if (!link.publicationYear) return null;
  if (link.publicationDay && link.publicationMonth)
    return fmtDate(new Date(link.publicationYear, link.publicationMonth - 1, link.publicationDay));
  if (link.publicationMonth)
    return new Date(link.publicationYear, link.publicationMonth - 1)
      .toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return String(link.publicationYear);
};

// Memoized link row — only re-renders when its own data changes
interface LinkRowProps {
  link: Link;
  userVoteCount: number;
  isAuthenticated: boolean;
  remainingBudget: number;
  userId: string | undefined;
  feedMode: "mine" | "both" | "public";
  onVote: (linkId: string, count: number) => Promise<boolean>;
  onRemoveVote: (linkId: string) => Promise<boolean>;
  onToggleVisibility: (linkId: string, makePublic: boolean) => void;
  onArchive: (linkId: string) => void;
  onUnarchive: (linkId: string) => void;
  onEdit: (link: Link) => void;
  onDelete: (linkId: string) => void;
  archiveView?: boolean;
  asCard?: boolean;
  compact?: boolean;
}

const LinkRow = memo(function LinkRow({
  link, userVoteCount, isAuthenticated, remainingBudget, userId, feedMode, onVote, onRemoveVote, onToggleVisibility, onArchive, onUnarchive, onEdit, onDelete, archiveView = false, asCard = false, compact = false,
}: LinkRowProps) {
  const isOwn = link.createdById === userId;
  // Amber tint only in "both" mode where private own links mix with public ones
  const isPrivate = feedMode === "both" && !link.isPublic && isOwn;
  const isUncategorized = !link.category;
  const canVote = !isUncategorized || isOwn;
  const pubDate = formatPubDate(link);
  const addedDate = fmtDate(new Date(link.timestamp));
  const archivedDate = link.archivedAt ? fmtDate(new Date(link.archivedAt)) : null;

  const cardBg = isPrivate
    ? "border-l-amber-400 bg-amber-50 hover:bg-amber-100"
    : "border-l-transparent bg-white hover:bg-gray-50";

  const articleClass = asCard
    ? `px-3 transition-colors rounded-lg border-l-4 border border-gray-200 flex flex-col h-full ${compact ? "py-1.5" : "py-3"} ${cardBg}`
    : `px-3 py-2.5 transition-colors border-l-2 ${isPrivate ? "border-amber-300 bg-amber-50 hover:bg-amber-100" : "border-transparent hover:bg-gray-50"}`;

  const actionIcons = (
    <div className={`flex ml-auto shrink-0 ${compact ? "gap-1" : "gap-2"}`}>
      {isAuthenticated && (
        <button
          onClick={() => link.archivedAt ? onUnarchive(link.id) : onArchive(link.id)}
          title={link.archivedAt ? "Unarchive" : "Archive"}
          className={`rounded-lg transition-colors ${compact ? "p-1" : "p-2"} ${link.archivedAt ? "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50" : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"}`}
        >
          {link.archivedAt ? (
            <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7l1.2 12A2 2 0 008.19 21h7.62a2 2 0 001.99-2L19 7M9 12l2 2 4-4M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z" /></svg>
          ) : (
            <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M5 7l1.2 12A2 2 0 008.19 21h7.62a2 2 0 001.99-2L19 7M10 11h4M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z" /></svg>
          )}
        </button>
      )}
      {isOwn && (
        <>
          <button onClick={() => onEdit(link)} title="Edit"
            className={`rounded-lg text-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors ${compact ? "p-1" : "p-2"}`}>
            <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => !isUncategorized && onToggleVisibility(link.id, !link.isPublic)}
            title={isUncategorized ? "Assign a category to make public" : link.isPublic ? "Make private" : "Make public"}
            className={`rounded-lg transition-colors ${compact ? "p-1" : "p-2"} ${isUncategorized ? "text-gray-300 cursor-not-allowed" : link.isPublic ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100" : "text-amber-400 hover:text-amber-600 hover:bg-amber-100"}`}>
            {link.isPublic
              ? <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              : <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            }
          </button>
          <button onClick={() => onDelete(link.id)} title="Delete"
            className={`rounded-lg text-red-300 hover:text-red-600 hover:bg-red-50 transition-colors ${compact ? "p-1" : "p-2"}`}>
            <svg className={compact ? "w-4 h-4" : "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </>
      )}
    </div>
  );

  return (
    <article className={articleClass}>
      <div className="flex items-start gap-2.5 flex-1">
        <VoteButton
          linkId={link.id}
          totalVotes={link.totalVotes}
          userVoteCount={userVoteCount}
          isAuthenticated={isAuthenticated}
          remainingBudget={remainingBudget}
          locked={!canVote}
          onVote={onVote}
          onRemoveVote={onRemoveVote}
        />
        {compact ? (
          /* ── Compact: 2-row layout ── */
          <div className="flex-1 min-w-0 select-text">
            {/* Row 1: title */}
            <h2 className="text-xs font-semibold text-gray-900 truncate leading-snug">
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                {link.title}
              </a>
            </h2>
            {/* Row 2: meta + by + icons */}
            <div className="flex items-center gap-x-1.5 text-xs text-gray-500 mt-0.5">
              {link.category
                ? <span className="shrink-0 px-1 py-0 bg-blue-100 text-blue-800 rounded text-[10px] font-medium select-none">{link.category}</span>
                : <span className="shrink-0 px-1 py-0 bg-amber-100 text-amber-700 rounded text-[10px] font-medium select-none italic">Uncat.</span>
              }
              {link.author && link.author !== "Unknown Author" && (
                <span className="truncate max-w-[100px] text-[10px]">{link.author}</span>
              )}
              <span className="shrink-0 text-gray-400 text-[10px]">{pubDate ?? addedDate}</span>
              {archiveView && archivedDate && <span className="shrink-0 text-emerald-600 text-[10px]">arch. {archivedDate}</span>}
              {link.submittedBy && <span className="text-[10px] text-gray-400 shrink-0">· {link.submittedBy}</span>}
              {actionIcons}
            </div>
          </div>
        ) : (
          /* ── Normal card layout ── */
          <div className="flex-1 min-w-0 select-text flex flex-col">
            <h2 className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-0.5">
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                {link.title}
              </a>
            </h2>
            <div className="flex items-center gap-x-1.5 text-xs text-gray-500 flex-wrap">
              {link.category
                ? <span className="shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium select-none">{link.category}</span>
                : <span className="shrink-0 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium select-none italic">Uncategorized</span>
              }
              {link.author && link.author !== "Unknown Author" && (
                <span className="truncate max-w-[120px]">{link.author}</span>
              )}
              <span className="shrink-0 text-gray-400">{pubDate ?? addedDate}</span>
              {archiveView && archivedDate && <span className="shrink-0 text-emerald-600">Archived {archivedDate}</span>}
            </div>
            {asCard && link.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-3 leading-relaxed">{link.description}</p>
            )}
            {(isAuthenticated || isOwn || link.submittedBy) && (
              <div className="flex items-center justify-between mt-auto pt-1.5">
                {link.submittedBy && (
                  <span className="text-[10px] text-gray-400">by {link.submittedBy}</span>
                )}
                {actionIcons}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
});

export default function LinkX() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { remainingBudget, vote: castVote, removeVote, getVoteCount, initFromServer } =
    useVoting(isAuthenticated);

  // Refs so fetchLinks can read current values without making it unstable.
  const userRef = useRef(user);
  const initFromServerRef = useRef(initFromServer);
  const lastFetchAuthKeyRef = useRef<string | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { initFromServerRef.current = initFromServer; }, [initFromServer]);

  const [allLinks, setAllLinks] = useState<Link[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<Link[]>([]);
  const [displayedLinks, setDisplayedLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [categoryIcons, setCategoryIcons] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInTitle, setSearchInTitle] = useState(true);
  const [searchInDescription, setSearchInDescription] = useState(true);
  const [searchInCategory, setSearchInCategory] = useState(true);
  const [searchInAuthor, setSearchInAuthor] = useState(true);

  const [sortMode, setSortMode] = useState<"hot" | "newest">("hot");
  const [compactView, setCompactView] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => {
    if (localStorage.getItem("compact_view") === "1") setCompactView(true);
  }, []);

  // Feed mode: "mine" | "both" | "public" — default "mine" for logged-in users
  const [feedMode, setFeedMode] = useState<"mine" | "both" | "public">("mine");
  useEffect(() => {
    const saved = localStorage.getItem("feed_mode");
    if (saved === "both" || saved === "public") setFeedMode(saved);
  }, []);

  const setFeed = useCallback((mode: "mine" | "both" | "public") => {
    setFeedMode(mode);
    localStorage.setItem("feed_mode", mode);
  }, []);

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const handleEdit = useCallback((link: Link) => {
    setEditingLink(link);
  }, []);

  const handleDelete = useCallback(async (linkId: string) => {
    const token = localStorage.getItem("user_token");
    const res = await fetch(`/api/links/${linkId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      setAllLinks((prev) => prev.filter((l) => l.id !== linkId));
      setTrashCount((c) => c + 1);
    }
  }, []);

  const [triageLinks, setTriageLinks] = useState<Link[]>([]);
  const [triageOpen, setTriageOpen] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Debounce search — only filter after 250ms of inactivity
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Memoized vote — stable reference so LinkRow memo works
  const vote = useCallback(async (linkId: string, count: number): Promise<boolean> => {
    const prev = getVoteCount(linkId);
    const delta = count - prev;
    if (delta > 0) setAllLinks((ls) => ls.map((l) => l.id === linkId ? { ...l, totalVotes: l.totalVotes + delta } : l));
    const ok = await castVote(linkId, count);
    if (!ok && delta > 0) setAllLinks((ls) => ls.map((l) => l.id === linkId ? { ...l, totalVotes: l.totalVotes - delta } : l));
    return ok;
  }, [castVote, getVoteCount]);

  const archiveLink = useCallback(async (linkId: string) => {
    const target = allLinks.find((link) => link.id === linkId);
    if (!target) return;

    const targetKey = linkUrlKey(target.url);
    const duplicateIds = allLinks
      .filter((link) => linkUrlKey(link.url) === targetKey)
      .map((link) => link.id);
    const previousArchivedAt = new Map(
      allLinks
        .filter((link) => duplicateIds.includes(link.id))
        .map((link) => [link.id, link.archivedAt])
    );
    const archivedAt = new Date().toISOString();
    setAllLinks((prev) => prev.map((link) => duplicateIds.includes(link.id) ? { ...link, archivedAt } : link));

    const token = localStorage.getItem("user_token");
    const responses = await Promise.all(duplicateIds.map((id) =>
      fetch("/api/links/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ linkId: id }),
      })
    ));

    if (responses.some((res) => !res.ok)) {
      setAllLinks((prev) => prev.map((link) => duplicateIds.includes(link.id) ? { ...link, archivedAt: previousArchivedAt.get(link.id) ?? null } : link));
      return;
    }

    const data = await responses[0].json().catch(() => null);
    if (data?.archive?.archivedAt) {
      setAllLinks((prev) => prev.map((link) => duplicateIds.includes(link.id) ? { ...link, archivedAt: data.archive.archivedAt } : link));
    }
  }, [allLinks]);

  const unarchiveLink = useCallback(async (linkId: string) => {
    const target = allLinks.find((link) => link.id === linkId);
    if (!target) return;

    const targetKey = linkUrlKey(target.url);
    const duplicateIds = allLinks
      .filter((link) => linkUrlKey(link.url) === targetKey)
      .map((link) => link.id);
    const previousArchivedAt = new Map(
      allLinks
        .filter((link) => duplicateIds.includes(link.id))
        .map((link) => [link.id, link.archivedAt])
    );
    setAllLinks((prev) => prev.map((link) => duplicateIds.includes(link.id) ? { ...link, archivedAt: null } : link));

    const token = localStorage.getItem("user_token");
    const responses = await Promise.all(duplicateIds.map((id) =>
      fetch("/api/links/archive", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ linkId: id }),
      })
    ));

    if (responses.some((res) => !res.ok)) {
      setAllLinks((prev) => prev.map((link) => duplicateIds.includes(link.id) ? { ...link, archivedAt: previousArchivedAt.get(link.id) ?? null } : link));
    }
  }, [allLinks]);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("user_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`/api/links`, { headers });
      if (!res.ok) return;

      const data = await res.json();
      const linkData: Link[] = data.links ?? [];
      setAllLinks(linkData);

      // Initialize votes from server data (no separate /api/votes call needed)
      if (data.userVotes && data.remainingBudget !== null) {
        initFromServerRef.current(data.userVotes, data.remainingBudget);
      }

      // Categories from server data (no separate /api/categories call needed)
      const catIcons: Record<string, string> = { All: "", ...data.categoryIcons };
      setCategoryIcons(catIcons);

      const now = Date.now();
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      const scores = new Map<string, number>();
      const currentUser = userRef.current;
      linkData.forEach((link) => {
        if (link.archivedAt) return;
        if (!link.category) return; // uncategorized links don't affect category bar
        const weight = currentUser && link.createdById === currentUser.id ? 3 : 1;
        const age = now - new Date(link.timestamp).getTime();
        const recency = Math.exp(-age / WEEK);
        scores.set(link.category, (scores.get(link.category) || 0) + weight + recency * 5);
      });

      setCategories([
        "All",
        ...Object.keys(data.categoryIcons)
          .filter((name) => scores.has(name))
          .sort((a, b) => (scores.get(b) || 0) - (scores.get(a) || 0)),
      ]);
    } catch (error) {
      console.error("Failed to fetch links:", error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const authKey = user?.id ?? "anonymous";
    if (lastFetchAuthKeyRef.current === authKey) return;
    lastFetchAuthKeyRef.current = authKey;
    fetchLinks();
  }, [authLoading, user?.id, fetchLinks]);

  // Fetch initial trash count for authenticated users
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("user_token");
    fetch("/api/links/trash?countOnly=true", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.count !== undefined) setTrashCount(d.count); })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    // Triage: own uncategorized links, only shown in "mine" mode
    if (isAuthenticated && feedMode === "mine" && user?.id) {
      setTriageLinks(
        allLinks
          .filter((l) => !l.archivedAt && !l.category && l.createdById === user.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
    } else {
      setTriageLinks([]);
    }

    let result = [...allLinks];
    if (isAuthenticated) {
      result = result.filter((link) => showArchived ? Boolean(link.archivedAt) : !link.archivedAt);
    }
    // Always exclude uncategorized from main feed
    result = result.filter((link) => Boolean(link.category));
    if (selectedCategory !== "All") {
      result = result.filter((link) => link.category === selectedCategory);
    }
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter((link) => {
        if (searchInTitle && link.title.toLowerCase().includes(query)) return true;
        if (searchInDescription && link.description?.toLowerCase().includes(query)) return true;
        if (searchInAuthor && link.author?.toLowerCase().includes(query)) return true;
        if (searchInCategory && link.category?.toLowerCase().includes(query)) return true;
        return false;
      });
    }
    // Filter by feed mode
    if (isAuthenticated && user?.id) {
      if (feedMode === "mine") {
        result = result.filter((link) => link.createdById === user.id);
      } else if (feedMode === "public") {
        result = result.filter((link) => link.isPublic);
      } else {
        // "both": own links + public links
        result = result.filter((link) => link.isPublic || link.createdById === user.id);
      }
    }

    // Client-side sort — instant, no server round-trip
    if (sortMode === "newest") {
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      result.sort((a, b) => b.hotScore - a.hotScore);
    }
    result = dedupeLinksByUrl(result);
    setFilteredLinks(result);
    setPage(1);
    setDisplayedLinks(result.slice(0, LINKS_PER_PAGE));
    setHasMore(result.length > LINKS_PER_PAGE);
  }, [allLinks, selectedCategory, debouncedQuery, sortMode, feedMode, showArchived, isAuthenticated, user, searchInTitle, searchInDescription, searchInAuthor, searchInCategory]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const end = nextPage * LINKS_PER_PAGE;
    setDisplayedLinks(filteredLinks.slice(0, end));
    setPage(nextPage);
    setHasMore(end < filteredLinks.length);
    setLoadingMore(false);
  }, [page, filteredLinks, loadingMore, hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  const toggleVisibility = useCallback(async (linkId: string, makePublic: boolean) => {
    try {
      const token = localStorage.getItem("user_token");
      const response = await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublic: makePublic }),
      });

      if (response.ok) {
        // Update local state
        setAllLinks((prev) =>
          prev.map((s) =>
            s.id === linkId ? { ...s, isPublic: makePublic } : s
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle visibility:", error);
    }
  }, []);

  // Memoized category icons lookup for CategoryButton
  const onSelectCategory = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setShowMobileMenu(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 select-none">
      {/* Header - Logo and User only */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-3 sticky top-0 z-50 shadow-lg">
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Image src="/android-chrome-192x192.png" alt="LinkX" width={28} height={28} className="rounded-md" />
            <span className={`${raleway.className} text-2xl tracking-wide`}>LinkX</span>
          </h1>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={() => setShowTrash(true)}
                title="Recycle bin"
                className="relative p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {trashCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {trashCount > 99 ? "99+" : trashCount}
                  </span>
                )}
              </button>
            )}
            <UserMenu remainingBudget={remainingBudget} />
          </div>
        </div>
      </header>

      {/* Categories Row - Sort toggle | separator | categories | burger */}
      <div className="bg-white border-b border-gray-200 sticky top-[52px] z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-2">
            {/* Sort Toggle — icon only */}
            <div className="flex rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
              <button
                onClick={() => setSortMode("hot")}
                title="Hot"
                className={`px-2.5 py-1.5 text-base transition-colors ${
                  sortMode === "hot" ? "bg-orange-500 text-white" : "bg-white hover:bg-gray-50"
                }`}
              >🔥</button>
              <button
                onClick={() => setSortMode("newest")}
                title="New"
                className={`px-2.5 py-1.5 text-base transition-colors ${
                  sortMode === "newest" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"
                }`}
              >✨</button>
            </div>


            {/* Feed mode toggle — only for authenticated users */}
            {isAuthenticated && (
              <div className="flex rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                <button onClick={() => setFeed("mine")} title="My links"
                  className={`px-2.5 py-1.5 text-base transition-colors ${feedMode === "mine" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}>
                  👤
                </button>
                <button onClick={() => setFeed("both")} title="My links + public"
                  className={`px-2.5 py-1.5 text-base transition-colors ${feedMode === "both" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}>
                  👥
                </button>
                <button onClick={() => setFeed("public")} title="Public feed"
                  className={`px-2.5 py-1.5 text-base transition-colors ${feedMode === "public" ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}>
                  🌐
                </button>
              </div>
            )}

            {/* Separator */}
            <div className="w-px h-8 bg-gray-300 flex-shrink-0" />

            {/* Categories - always single scrollable row */}
            <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center gap-1 w-max">
                {categories.map((cat) => {
                  const icon = categoryIcons[cat] || "📁";
                  const isActive = selectedCategory === cat;
                  return (
                    <button key={cat} onClick={() => onSelectCategory(cat)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap ${isActive ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-700"}`}
                      title={cat}
                    >
                      {icon && <span className="text-base">{icon}</span>}
                      <span className="text-sm hidden sm:inline">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* More button - shows when there are more categories than displayed */}
            {categories.length > 3 && (
              <button
                onClick={() => setShowMobileMenu(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0 border border-gray-300"
                title="More categories"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-sm hidden sm:inline">More</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Slide-in Menu */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed top-0 right-0 h-full w-72 bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">All Categories</h2>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 flex flex-col items-center gap-2">
              {categories.map((cat) => {
                const icon = categoryIcons[cat] || "📁";
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {icon && <span className="text-xl">{icon}</span>}
                    <span className="text-sm font-medium">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Search Row */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search links..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`p-2 rounded-lg border transition-colors ${
                showAdvanced
                  ? "bg-blue-100 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
              }`}
              title="Advanced search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button
              onClick={() => setCompactView((v) => { const next = !v; localStorage.setItem("compact_view", next ? "1" : "0"); return next; })}
              title={compactView ? "Comfortable view" : "Compact view"}
              className={`p-2 rounded-lg border transition-colors ${compactView ? "bg-gray-800 text-white border-gray-800" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}
            >
              {compactView ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 9h16M4 13h8M4 17h8" /></svg>
              )}
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setShowArchived((v) => !v)}
                aria-label={showArchived ? "Show active links" : "Show archived links"}
                title={showArchived ? "Show active links" : "Show archived links"}
                className={`flex items-center gap-1.5 p-2 rounded-lg border transition-colors ${showArchived ? "bg-emerald-600 text-white border-emerald-600" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"}`}
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-medium">{showArchived ? "Archived" : "Archive"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Search Panel */}
      {showAdvanced && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-800">
              <span className="text-gray-600 font-medium shrink-0">Search in:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={searchInTitle} onChange={(e) => setSearchInTitle(e.target.checked)} className="rounded text-blue-600" />
                <span className="text-gray-700">Title</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={searchInDescription} onChange={(e) => setSearchInDescription(e.target.checked)} className="rounded text-blue-600" />
                <span className="text-gray-700">Description</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={searchInAuthor} onChange={(e) => setSearchInAuthor(e.target.checked)} className="rounded text-blue-600" />
                <span className="text-gray-700">Author</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={searchInCategory} onChange={(e) => setSearchInCategory(e.target.checked)} className="rounded text-blue-600" />
                <span className="text-gray-700">Category</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="px-4 sm:px-6 lg:px-8 py-2 text-sm text-gray-500">
        {filteredLinks.length} links
        {showArchived && " archived"}
        {selectedCategory !== "All" && ` in ${selectedCategory}`}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Triage Queue */}
      {triageLinks.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 pb-3">
          <div className="rounded-lg border border-amber-300 overflow-hidden">
            <button
              onClick={() => setTriageOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 hover:bg-amber-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-semibold text-sm">📥 To Organize</span>
                <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">{triageLinks.length}</span>
              </div>
              <svg className={`w-4 h-4 text-amber-500 transition-transform ${triageOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {triageOpen && (
              <div className="divide-y divide-amber-100 bg-white">
                {triageLinks.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    userVoteCount={getVoteCount(link.id)}
                    isAuthenticated={isAuthenticated}
                    remainingBudget={remainingBudget}
                    userId={user?.id}
                    feedMode={feedMode}
                    onVote={vote}
                    onRemoveVote={removeVote}
                    onToggleVisibility={toggleVisibility}
                    onArchive={archiveLink}
                    onUnarchive={unarchiveLink}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    archiveView={showArchived}
                    compact={compactView}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Links */}
      <main className="px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Loading links...
          </div>
        ) : displayedLinks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No links found.
          </div>
        ) : (
          <>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))" }}>
              {displayedLinks.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  userVoteCount={getVoteCount(link.id)}
                  isAuthenticated={isAuthenticated}
                  remainingBudget={remainingBudget}
                  userId={user?.id}
                  feedMode={feedMode}
                  onVote={vote}
                  onRemoveVote={removeVote}
                  onToggleVisibility={toggleVisibility}
                  onArchive={archiveLink}
                  onUnarchive={unarchiveLink}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  archiveView={showArchived}
                  asCard
                  compact={compactView}
                />
              ))}
            </div>
            {hasMore && (
              <div ref={loaderRef} className="p-4 text-center text-gray-500 text-sm">
                {loadingMore ? "Loading more..." : "Scroll for more"}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Add Button */}
      {isAuthenticated && (
        <button
          onClick={() => setShowSubmitModal(true)}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-xl flex items-center justify-center transition-colors"
          title="Add Link"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Add Link Modal */}
      <UserSubmitLinkModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSuccess={fetchLinks}
      />

      {/* Edit Link Modal */}
      <UserSubmitLinkModal
        isOpen={!!editingLink}
        onClose={() => setEditingLink(null)}
        onSuccess={() => { setEditingLink(null); fetchLinks(); }}
        link={editingLink ?? undefined}
      />

      {/* Recycle Bin Modal */}
      <RecycleBinModal
        isOpen={showTrash}
        onClose={() => setShowTrash(false)}
        onRestored={fetchLinks}
        onCountChange={setTrashCount}
      />

    </div>
  );
}
