import type { FetchedNewsItem, NewsSourceConfig } from "../types";
import { fetchFromRss } from "./rss";
import { fetchFromNewsroomHtml } from "./newsroom-html";

export async function fetchFromSource(source: NewsSourceConfig): Promise<FetchedNewsItem[]> {
  switch (source.sourceType) {
    case "rss":
      return fetchFromRss(source);
    case "newsroom_html":
      return fetchFromNewsroomHtml(source);
    case "api":
      return fetchFromApiPlaceholder(source);
    case "media_kit":
    case "requires_login":
      return [];
    default:
      return [];
  }
}

/** Placeholder pod przyszłe oficjalne API — struktura gotowa, implementacja per-źródło. */
async function fetchFromApiPlaceholder(source: NewsSourceConfig): Promise<FetchedNewsItem[]> {
  const res = await fetch(source.fetchUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "IDRIVECARS-NewsBot/1.0 (+https://idrivecars.pl)"
    },
    signal: AbortSignal.timeout(25_000)
  });
  if (!res.ok) throw new Error(`API ${source.id}: HTTP ${res.status}`);
  const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
  const max = source.maxItemsPerRun ?? 10;
  return (data.items ?? []).slice(0, max).map((item) => ({
    title: String(item.title ?? ""),
    sourceUrl: String(item.url ?? item.link ?? source.fetchUrl),
    publishedAt: String(item.publishedAt ?? item.date ?? new Date().toISOString()),
    lead: String(item.summary ?? item.description ?? "").slice(0, 400),
    bodyText: String(item.body ?? item.content ?? "")
  }));
}
