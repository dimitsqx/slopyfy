import type { LiveFilters } from "./types";

export function shouldUseFallback(rawTranscript: string, filters: LiveFilters): boolean {
  const normalized = rawTranscript.trim();
  if (normalized.length < 12) {
    return false;
  }

  const hasStructuredMatch =
    Boolean(filters.category) ||
    Boolean(filters.gender) ||
    Boolean(filters.size) ||
    Boolean(filters.color) ||
    typeof filters.maxPrice === "number";

  return !hasStructuredMatch;
}
