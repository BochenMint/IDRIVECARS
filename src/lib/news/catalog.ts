import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { NewsSourceConfig } from "./types";

const CATALOG_PATH = path.join(process.cwd(), "content", "news-catalog", "sources.json");
const LEGACY_RSS_PATH = path.join(process.cwd(), "content", "news-sources.json");
const LEGACY_PRESS_PATH = path.join(process.cwd(), "content", "press-sources.json");

export function getCatalogPath(): string {
  return CATALOG_PATH;
}

export async function loadNewsCatalog(): Promise<NewsSourceConfig[]> {
  if (existsSync(CATALOG_PATH)) {
    const raw = await fs.readFile(CATALOG_PATH, "utf8");
    const parsed = JSON.parse(raw) as NewsSourceConfig[];
    return parsed.filter((s) => s.enabled !== false || s.enabled === undefined);
  }
  return mergeLegacySources();
}

export async function loadAllNewsSources(): Promise<NewsSourceConfig[]> {
  if (existsSync(CATALOG_PATH)) {
    const raw = await fs.readFile(CATALOG_PATH, "utf8");
    return JSON.parse(raw) as NewsSourceConfig[];
  }
  return mergeLegacySources();
}

/** Kompatybilność wsteczna: scala stare pliki RSS + press-sources. */
async function mergeLegacySources(): Promise<NewsSourceConfig[]> {
  const out: NewsSourceConfig[] = [];

  if (existsSync(LEGACY_RSS_PATH)) {
    const rss = JSON.parse(await fs.readFile(LEGACY_RSS_PATH, "utf8")) as Array<{
      name: string;
      url: string;
      enabled?: boolean;
      maxItemsPerRun?: number;
    }>;
    for (const s of rss) {
      out.push({
        id: slugifyId(s.name),
        name: s.name,
        brands: [s.name],
        region: "global",
        sourceType: "rss",
        fetchUrl: s.url,
        loginRequired: false,
        enabled: s.enabled !== false,
        maxItemsPerRun: s.maxItemsPerRun ?? 10
      });
    }
  }

  if (existsSync(LEGACY_PRESS_PATH)) {
    const press = JSON.parse(await fs.readFile(LEGACY_PRESS_PATH, "utf8")) as Array<{
      id: string;
      name: string;
      pressUrl: string;
      loginRequired: boolean;
      region: string;
    }>;
    for (const s of press) {
      out.push({
        id: s.id,
        name: s.name,
        brands: [s.name],
        region: (s.region as NewsSourceConfig["region"]) || "global",
        sourceType: s.loginRequired ? "requires_login" : "newsroom_html",
        fetchUrl: s.pressUrl,
        pressUrl: s.pressUrl,
        loginRequired: s.loginRequired,
        enabled: false,
        maxItemsPerRun: 5
      });
    }
  }

  return out;
}

function slugifyId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function filterSourcesForScan(sources: NewsSourceConfig[]): NewsSourceConfig[] {
  return sources
    .filter((s) => s.enabled)
    .filter(
      (s) =>
        s.sourceType !== "requires_login" &&
        s.sourceType !== "media_kit" &&
        s.sourceType !== "external_media"
    )

    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export function passesKeywordFilters(
  item: { title: string; lead?: string },
  source: NewsSourceConfig
): boolean {
  const text = `${item.title} ${item.lead ?? ""}`.toLowerCase();
  if (source.excludeKeywords?.some((k) => text.includes(k.toLowerCase()))) return false;
  if (!source.includeKeywords?.length) return true;
  return source.includeKeywords.some((k) => text.includes(k.toLowerCase()));
}
