/**
 * Builds CMS MDX from staged autoGALERIA import JSON.
 * Shared by integrate-autogaleria-cms and audit:source-fidelity --fix.
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { sanitizeProsConsList } from "./pros-cons";
import { dedupeImportedProsConsSections } from "../../../src/lib/content/html";

export type CmsCategory = "test" | "pierwsza-jazda" | "blog" | "felieton" | "news";
export type Status = "draft" | "published";

export type ImportedArticle = {
  slug: string;
  urlKey: string;
  sourceUrl: string;
  title: string;
  lead?: string;
  excerpt?: string;
  category?: string;
  categories?: Array<{ name: string; slug?: string }>;
  tags?: string[];
  publishedAt: string;
  author?: { name?: string; key?: string };
  bodyMarkdown: string;
  pros?: string[];
  cons?: string[];
  summary?: string;
  youtube?: Array<{ videoId: string; url: string; embedUrl: string }>;
  images?: {
    thumbnail?: string | null;
    gallery?: string[];
    inline?: string[];
  };
  tables?: Array<{ title?: string; table?: Array<{ title: string; text: string }> }>;
  meta?: { title?: string; description?: string };
  cars?: string[];
  provenance?: {
    discoveredVia?: string;
    importedAt?: string;
    importer?: string;
  };
  imageCacheLocal?: string[];
};

const ROOT = process.cwd();
const PUBLIC_GALLERIES = path.join(ROOT, "public", "galleries");

const NEWS_LIKE = new Set([
  "Nowości i premiery",
  "Producenci i rynek",
  "Ciekawostki",
  "Prototypy i wizje",
  "Tuning i modyfikacje",
  "Wydarzenia",
  "Motorsport"
]);

const BLOG_LIKE = new Set(["Po godzinach...", "autoGALERIA", "Tapety"]);

const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/^mercedes-maybach\b/i, "Mercedes-Maybach"],
  [/^mercedes-amg\b/i, "Mercedes-AMG"],
  [/^mercedes-benz\b/i, "Mercedes-Benz"],
  [/^mercedes\b/i, "Mercedes-Benz"],
  [/^alfa romeo\b/i, "Alfa Romeo"],
  [/^land rover\b/i, "Land Rover"],
  [/^rolls-royce\b/i, "Rolls-Royce"],
  [/^aston martin\b/i, "Aston Martin"],
  [/^volkswagen\b/i, "Volkswagen"],
  [/^citroen\b/i, "Citroen"],
  [/^porsche\b/i, "Porsche"],
  [/^maserati\b/i, "Maserati"],
  [/^bentley\b/i, "Bentley"],
  [/^renault\b/i, "Renault"],
  [/^mclaren\b/i, "McLaren"],
  [/^koenigsegg\b/i, "Koenigsegg"],
  [/^brabus\b/i, "Brabus"],
  [/^lexus\b/i, "Lexus"],
  [/^mazda\b/i, "Mazda"],
  [/^skoda\b/i, "Skoda"],
  [/^volvo\b/i, "Volvo"],
  [/^ford\b/i, "Ford"],
  [/^fiat\b/i, "Fiat"],
  [/^seat\b/i, "Seat"],
  [/^bmw\b/i, "BMW"],
  [/^audi\b/i, "Audi"],
  [/^jeep\b/i, "Jeep"],
  [/^opel\b/i, "Opel"],
  [/^smart\b/i, "Smart"]
];

function quote(value: string): string {
  return JSON.stringify(value.replace(/\r\n/g, "\n").trim());
}

function yamlArray(values: string[] | undefined): string {
  if (!values?.length) return "[]";
  return `[${values.map(quote).join(", ")}]`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanupModel(value: string): string {
  return value
    .replace(/^[\s:–—-]+/, "")
    .replace(/\s+\|\s+GALERIA$/i, "")
    .trim();
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function mapCategory(article: ImportedArticle): CmsCategory {
  const ag = article.category ?? article.categories?.[0]?.name ?? "";
  const title = article.title.toLowerCase();
  const slug = article.slug.toLowerCase();

  if (ag === "TESTY") return "test";
  if (ag === "Pierwsze jazdy" || title.includes("pierwsza jazda") || slug.includes("pierwsza-jazda")) {
    return "pierwsza-jazda";
  }
  if (ag === "Felietony") return "felieton";
  if (NEWS_LIKE.has(ag)) return "news";
  if (BLOG_LIKE.has(ag)) return "blog";
  return "blog";
}

export function isGalleryOrShort(article: ImportedArticle): boolean {
  const textLength = (article.bodyMarkdown ?? "").trim().length;
  const imageCount = (article.images?.gallery?.length ?? 0) + (article.images?.inline?.length ?? 0);
  const marker = `${article.title} ${article.slug} ${article.category ?? ""}`.toLowerCase();
  return (
    textLength < 800 ||
    marker.includes("tapety") ||
    marker.includes("galeria") ||
    (imageCount >= 10 && textLength < 1600)
  );
}

function inferBrandModel(article: ImportedArticle): { brand: string; model: string } {
  if (article.cars?.[0]) {
    const brand = article.cars[0];
    return {
      brand,
      model: cleanupModel(article.title.replace(new RegExp(`^${escapeRegExp(brand)}\\s*`, "i"), ""))
    };
  }

  for (const [pattern, brand] of BRAND_ALIASES) {
    if (!pattern.test(article.title)) continue;
    return {
      brand,
      model: cleanupModel(article.title.replace(pattern, ""))
    };
  }

  const [first, ...rest] = article.title.split(/\s+/);
  return {
    brand: first || "Auto",
    model: cleanupModel(rest.join(" ")) || article.title
  };
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFilesRecursive(full)));
    else out.push(full);
  }
  return out;
}

export async function resolveMedia(
  article: ImportedArticle,
  preserve?: { galleryDir?: string; heroImage?: string }
): Promise<{ heroImage?: string; galleryDir?: string; warnings: string[] }> {
  const warnings: string[] = [];

  if (preserve?.galleryDir) {
    const rel = preserve.galleryDir.replace(/^galleries\//, "");
    const galleryPath = path.join(PUBLIC_GALLERIES, rel);
    if (existsSync(galleryPath)) {
      const files = await listFilesRecursive(galleryPath);
      const webp = files.find((f) => f.endsWith(".webp"));
      return {
        galleryDir: preserve.galleryDir,
        heroImage: preserve.heroImage ?? (webp ? path.relative(path.join(ROOT, "public"), webp).replace(/\\/g, "/") : undefined),
        warnings
      };
    }
  }

  const galleryPath = path.join(PUBLIC_GALLERIES, article.slug);
  if (existsSync(galleryPath)) {
    const files = await listFilesRecursive(galleryPath);
    const webp = files.find((f) => f.endsWith(".webp"));
    if (webp) {
      return {
        galleryDir: `galleries/${article.slug}`,
        heroImage: path.relative(path.join(ROOT, "public"), webp).replace(/\\/g, "/"),
        warnings
      };
    }
  }

  if (article.imageCacheLocal?.length) {
    warnings.push(`Obrazy tylko w cache importu (${article.imageCacheLocal.length})`);
  }

  return { warnings };
}

function tablesToMarkdown(tables: ImportedArticle["tables"]): string {
  if (!tables?.length) return "";
  const parts: string[] = [];
  for (const block of tables) {
    const rows = block.table ?? [];
    if (!rows.length) continue;
    parts.push(`## ${block.title ?? "Dane techniczne"}`, "", "| Parametr | Wartość |", "| --- | --- |");
    for (const row of rows) {
      const label = row.title.replace(/\|/g, "\\|");
      const value = row.text.replace(/\|/g, "\\|").replace(/\n/g, " ");
      parts.push(`| ${label} | ${value} |`);
    }
  }
  return parts.join("\n");
}

export function buildBody(article: ImportedArticle): string {
  const pros = sanitizeProsConsList(article.pros ?? []);
  const cons = sanitizeProsConsList(article.cons ?? []);
  const hasStructuredSections =
    pros.length > 0 || cons.length > 0 || Boolean(article.summary?.trim());

  let body = article.bodyMarkdown.trim();
  if (hasStructuredSections) {
    body = dedupeImportedProsConsSections(body);
  }

  const parts = [body];

  const tables = tablesToMarkdown(article.tables);
  if (tables) parts.push(tables);

  if (pros.length) {
    parts.push("## Zalety", "", ...pros.map((p) => `- ${p}`));
  }
  if (cons.length) {
    parts.push("## Wady", "", ...cons.map((c) => `- ${c}`));
  }
  parts.push(...getSummaryBlock(article.summary));

  if (article.youtube?.length) {
    parts.push(
      "## Wideo",
      "",
      ...article.youtube.map((yt) => `- [YouTube ${yt.videoId}](${yt.url})`)
    );
  }

  return parts.filter(Boolean).join("\n\n").replace(/\n{4,}/g, "\n\n");
}

function getSummaryBlock(summary: string | undefined): string[] {
  if (!summary?.trim()) return [];
  return ["## Podsumowanie", "", summary.trim()];
}

export function buildFrontmatter(
  article: ImportedArticle,
  category: CmsCategory,
  status: Status,
  media: { heroImage?: string; galleryDir?: string }
): string {
  const lines: string[] = [
    "---",
    `slug: ${quote(article.slug)}`,
    `title: ${quote(article.title)}`,
    `author: ${quote(article.author?.name ?? "Marcin Bochenek")}`,
    `publishedAt: ${quote(article.publishedAt)}`,
    `category: ${category}`,
    `status: ${status}`,
    `lead: ${quote(truncate(article.lead || article.excerpt || article.meta?.description || "", 320) ?? "")}`,
    `originalUrl: ${quote(article.sourceUrl)}`,
    `sourceUrl: ${quote(article.sourceUrl)}`,
    `seoTitle: ${quote(truncate(article.meta?.title || article.title, 70) ?? article.title)}`,
    `seoDescription: ${quote(truncate(article.meta?.description || article.lead || article.excerpt || "", 170) ?? "")}`,
    `tags: ${yamlArray(article.tags)}`
  ];

  if (category === "test" || category === "pierwsza-jazda") {
    const { brand, model } = inferBrandModel(article);
    lines.push(`brand: ${quote(brand)}`);
    lines.push(`model: ${quote(model || article.title)}`);
    const year = Number(article.publishedAt.slice(0, 4));
    if (Number.isFinite(year)) lines.push(`year: ${year}`);
  }

  if (media.heroImage) lines.push(`heroImage: ${quote(media.heroImage)}`);
  if (media.galleryDir) lines.push(`galleryDir: ${quote(media.galleryDir)}`);
  if (article.youtube?.[0]?.url) lines.push(`videoUrl: ${quote(article.youtube[0].url)}`);
  if (article.pros?.length) lines.push(`pros: ${yamlArray(sanitizeProsConsList(article.pros))}`);
  if (article.cons?.length) lines.push(`cons: ${yamlArray(sanitizeProsConsList(article.cons))}`);
  if (article.summary) lines.push(`summary: ${quote(article.summary)}`);

  lines.push("import:");
  lines.push("  source: autogaleria");
  lines.push(`  importedAt: ${quote(article.provenance?.importedAt ?? new Date().toISOString())}`);
  lines.push(`  sourceId: ${quote(article.urlKey)}`);
  lines.push(
    `  sourceFile: ${quote(path.join("content", "import", "autogaleria", "articles", "json", `${article.slug}.json`).replace(/\\/g, "/"))}`
  );
  lines.push("---");
  return lines.join("\n");
}

export async function composeMdxFromImport(
  article: ImportedArticle,
  options?: {
    preserveGallery?: { galleryDir?: string; heroImage?: string };
    preserveStatus?: Status;
  }
): Promise<string> {
  const category = mapCategory(article);
  const status = options?.preserveStatus ?? (isGalleryOrShort(article) ? "draft" : "published");
  const media = await resolveMedia(article, options?.preserveGallery);
  const frontmatter = buildFrontmatter(article, category, status, media);
  const body = buildBody(article);
  return `${frontmatter}\n\n${body}\n`;
}
