import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { NewsItem, UserDecision } from "./types-news";

const NEWS_DIR = path.join(process.cwd(), "content", "news");
const NEWS_DECISIONS_PATH = path.join(process.cwd(), "content", "news-decisions.json");

export type NewsDecisionRecord = { userDecision: UserDecision; decidedAt: string };

async function getDecisionsMap(): Promise<Record<string, NewsDecisionRecord>> {
  if (!existsSync(NEWS_DECISIONS_PATH)) return {};
  try {
    const raw = await fs.readFile(NEWS_DECISIONS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function setNewsDecision(slug: string, userDecision: UserDecision): Promise<void> {
  const map = await getDecisionsMap();
  map[slug] = { userDecision, decidedAt: new Date().toISOString() };
  await fs.mkdir(path.dirname(NEWS_DECISIONS_PATH), { recursive: true });
  await fs.writeFile(NEWS_DECISIONS_PATH, JSON.stringify(map, null, 2), "utf8");
}

function toSlug(title: string, date: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${date.slice(0, 10)}-${base}`.slice(0, 80);
}

export async function getAllNewsSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(NEWS_DIR);
    return entries
      .filter((n) => n.endsWith(".mdx") || n.endsWith(".md"))
      .map((n) => n.replace(/\.mdx?$/, ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export async function getNewsItems(limit = 50): Promise<NewsItem[]> {
  const slugs = await getAllNewsSlugs();
  const items: NewsItem[] = [];
  for (const slug of slugs.slice(0, limit)) {
    const item = await getNewsBySlug(slug);
    if (item && item.status !== "rejected" && item.status !== "draft") items.push(item);
  }
  return items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  const mdxPath = path.join(NEWS_DIR, `${slug}.mdx`);
  const mdPath = path.join(NEWS_DIR, `${slug}.md`);
  let raw: string;
  try {
    raw = await fs.readFile(mdxPath, "utf8");
  } catch {
    try {
      raw = await fs.readFile(mdPath, "utf8");
    } catch {
      return null;
    }
  }
  const { data } = matter(raw);
  const decisions = await getDecisionsMap();
  const dec = decisions[slug];
  return {
    slug,
    title: (data.title as string) ?? slug,
    lead: (data.lead as string) ?? "",
    sourceUrl: (data.sourceUrl as string) ?? "",
    sourceName: (data.sourceName as string) ?? "",
    publishedAt: (data.publishedAt as string) ?? "",
    image: data.image as string | undefined,
    status: (data.status as NewsItem["status"]) ?? "published",
    sourceType: data.sourceType as NewsItem["sourceType"],
    manufacturerId: data.manufacturerId as string | undefined,
    userDecision: dec?.userDecision ?? (data.userDecision as UserDecision | undefined) ?? null,
    decidedAt: dec?.decidedAt ?? (data.decidedAt as string | undefined) ?? null,
    styleReference: (data.styleReference as NewsItem["styleReference"]) ?? "testy"
  };
}
