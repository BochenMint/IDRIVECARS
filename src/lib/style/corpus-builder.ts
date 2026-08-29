import fs from "node:fs/promises";
import path from "node:path";
import type { StyleArticleKind, StyleCorpusEntry } from "./types";
import { AG_IMPORT_JSON_DIR } from "./paths";
import {
  extractBoldHeadings,
  extractBrandsFromText,
  stripMarkdown,
  takeExcerpts,
  wordCount
} from "./text-utils";

type AgImportArticle = {
  slug: string;
  title: string;
  lead?: string;
  excerpt?: string;
  category?: string;
  categories?: Array<{ name: string; slug: string }>;
  tags?: string[];
  publishedAt?: string;
  author?: { name: string; key: string };
  headings?: Array<{ level: number; text: string }>;
  bodyMarkdown?: string;
  bodyHtml?: string;
  pros?: string[];
  cons?: string[];
  summary?: string;
  sourceUrl?: string;
  cars?: Array<{ brand?: string; model?: string }>;
};

export function mapCategoryToKind(category: string, title: string): StyleArticleKind {
  const c = category.toLowerCase();
  const t = title.toLowerCase();
  if (c.includes("test") && !c.includes("pierwsz")) return "test";
  if (c.includes("pierwsz") || t.includes("pierwsza jazda")) return "pierwsza-jazda";
  if (c.includes("felieton") || c.includes("blog")) return "felieton";
  if (
    c.includes("motorsport") ||
    c.includes("ciekawost") ||
    c.includes("nowo") ||
    c.includes("producent") ||
    c.includes("rynek")
  ) {
    return "news";
  }
  if (c.includes("autogaleria") || c.includes("tapet")) return "galeria";
  return "other";
}

function extractModels(title: string, tags: string[]): string[] {
  const models: string[] = [];
  const titleNorm = title.replace(/\|.*$/, "").trim();
  if (titleNorm.length > 3) models.push(titleNorm);
  for (const tag of tags) {
    if (/\d/.test(tag) || tag.split(" ").length <= 4) {
      models.push(tag);
    }
  }
  return [...new Set(models)].slice(0, 8);
}

export function articleJsonToCorpusEntry(raw: AgImportArticle): StyleCorpusEntry | null {
  if (raw.author?.key && raw.author.key !== "marcin-bochenek") return null;
  const md = raw.bodyMarkdown ?? "";
  if (!md.trim() && !raw.lead?.trim()) return null;

  const bodyPlain = stripMarkdown(md);
  const lead = (raw.lead ?? raw.excerpt ?? "").trim();
  const category = raw.category ?? raw.categories?.[0]?.name ?? "unknown";
  const tags = raw.tags ?? [];
  const headingTexts = [
    ...(raw.headings?.map((h) => h.text) ?? []),
    ...extractBoldHeadings(md)
  ];
  const uniqueHeadings = [...new Set(headingTexts.map((h) => h.trim()).filter(Boolean))];

  const brandsFromCars = (raw.cars ?? [])
    .map((c) => c.brand)
    .filter((b): b is string => Boolean(b));
  const brands = [
    ...new Set([
      ...brandsFromCars.map((b) => b.toLowerCase()),
      ...extractBrandsFromText(raw.title, lead, bodyPlain, tags.join(" "))
    ])
  ];

  return {
    slug: raw.slug,
    title: raw.title.trim(),
    lead,
    publishedAt: raw.publishedAt ?? "",
    category,
    kind: mapCategoryToKind(category, raw.title),
    tags,
    brands,
    models: extractModels(raw.title, tags),
    headings: uniqueHeadings,
    bodyPlain,
    excerpts: takeExcerpts(bodyPlain),
    pros: raw.pros ?? [],
    cons: raw.cons ?? [],
    summary: raw.summary ?? "",
    sourceUrl: raw.sourceUrl ?? "",
    wordCount: wordCount(bodyPlain)
  };
}

export async function loadImportArticles(dir = AG_IMPORT_JSON_DIR): Promise<AgImportArticle[]> {
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  const articles: AgImportArticle[] = [];
  for (const file of files.sort()) {
    const raw = JSON.parse(await fs.readFile(path.join(dir, file), "utf8")) as AgImportArticle;
    articles.push(raw);
  }
  return articles;
}

export async function buildCorpusFromImport(dir = AG_IMPORT_JSON_DIR): Promise<StyleCorpusEntry[]> {
  const articles = await loadImportArticles(dir);
  const entries: StyleCorpusEntry[] = [];
  for (const article of articles) {
    const entry = articleJsonToCorpusEntry(article);
    if (!entry) continue;
    const effectiveWords = entry.wordCount || wordCount(entry.lead);
    if (effectiveWords >= 15) entries.push(entry);
  }
  return entries.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function writeCorpusJsonl(
  entries: StyleCorpusEntry[],
  outPath: string
): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  const lines = entries.map((e) => JSON.stringify(e));
  await fs.writeFile(outPath, `${lines.join("\n")}\n`, "utf8");
}

export async function readCorpusJsonl(path: string): Promise<StyleCorpusEntry[]> {
  const raw = await fs.readFile(path, "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as StyleCorpusEntry);
}
