import * as cheerio from "cheerio";
import type { FetchedNewsItem, NewsSourceConfig } from "../types";

const UA = "IDRIVECARS-NewsBot/1.0 (+https://idrivecars.pl)";

const DEFAULT_SELECTORS = {
  article: "article, .news-item, .press-release, .teaser, li",
  title: "h1, h2, h3, .title, a",
  link: "a",
  date: "time, .date, .published",
  image: "img",
  summary: "p, .summary, .teaser-text"
};

export async function fetchFromNewsroomHtml(
  source: NewsSourceConfig
): Promise<FetchedNewsItem[]> {
  const selectors = { ...DEFAULT_SELECTORS, ...source.selectors };
  const res = await fetch(source.fetchUrl, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(25_000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} dla ${source.fetchUrl}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const base = new URL(source.fetchUrl);
  const max = source.maxItemsPerRun ?? 8;
  const items: FetchedNewsItem[] = [];
  const seen = new Set<string>();

  $(selectors.article).each((_, el) => {
    if (items.length >= max) return false;

    const root = $(el);
    const titleEl = root.find(selectors.title).first();
    const linkEl = root.find(selectors.link).first();
    const href = linkEl.attr("href") ?? titleEl.attr("href");
    const title = titleEl.text().trim() || linkEl.text().trim();
    if (!title || !href) return;

    let sourceUrl: string;
    try {
      sourceUrl = new URL(href, base).toString();
    } catch {
      return;
    }
    if (seen.has(sourceUrl)) return;
    seen.add(sourceUrl);

    const dateText = root.find(selectors.date).first().attr("datetime") ??
      root.find(selectors.date).first().text().trim();
    const publishedAt = parseDate(dateText);
    const summary = root.find(selectors.summary).first().text().trim();
    const imgSrc = root.find(selectors.image).first().attr("src");
    let imageUrl: string | undefined;
    if (imgSrc) {
      try {
        imageUrl = new URL(imgSrc, base).toString();
      } catch {
        imageUrl = undefined;
      }
    }

    items.push({
      title,
      sourceUrl,
      publishedAt,
      lead: summary.slice(0, 400),
      images: imageUrl
        ? [{ url: imageUrl, license: "Materiał prasowy — weryfikuj prawa przed publikacją" }]
        : []
    });
  });

  return items;
}

function parseDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
