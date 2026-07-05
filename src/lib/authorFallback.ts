export const UNKNOWN_AUTHOR = "Unknown Author";

export function authorFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function normalizeAuthor(author: unknown, url: string): string {
  const value = typeof author === "string" ? author.trim() : "";
  if (value && value !== UNKNOWN_AUTHOR) return value;
  return authorFromUrl(url) ?? UNKNOWN_AUTHOR;
}
