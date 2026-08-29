import { createHash } from "node:crypto";

/** Normalizuje tytuł/URL do stabilnego hasha deduplikacji. */
export function normalizeForHash(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashContent(parts: {
  sourceUrl: string;
  title: string;
  publishedAt?: string;
}): string {
  const payload = [
    normalizeForHash(parts.sourceUrl),
    normalizeForHash(parts.title),
    parts.publishedAt?.slice(0, 10) ?? ""
  ].join("|");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function makeRecordId(contentHash: string, sourceId: string): string {
  return `${sourceId}-${contentHash}`;
}

export function toSlug(title: string, dateIso: string): string {
  const date = dateIso.slice(0, 10).replace(/-/g, "");
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${date}-${base}`.slice(0, 80);
}
