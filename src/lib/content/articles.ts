import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import {
  articlePublicPath,
  type ArticleCategory,
  CATEGORY_CONTENT_DIRS,
  isArticleCategory
} from "./categories";
import { cleanArticleMarkdown } from "./html";
import {
  hasWallpapersShortcode,
  removeWallpapersShortcode,
  stripWallpapersFromHtml
} from "./wallpapers";
import type { Article, ArticleMeta, ImportProvenance, PublicationStatus } from "./types-article";
import { SITE_AUTHOR } from "@/lib/site";

const CONTENT_ROOT = path.join(process.cwd(), "content");

const SCAN_DIRS = ["testy", "blog", "felieton"] as const;

const EXCLUDED_SLUGS = new Set(["przykladowy-test", "readme"]);

function normalizeSlug(filename: string): string {
  return filename.replace(/\.mdx?$/, "");
}

function inferCategory(
  slug: string,
  contentDir: string,
  data: Record<string, unknown>
): ArticleCategory {
  const explicit = data.category;
  if (typeof explicit === "string" && isArticleCategory(explicit)) {
    return explicit;
  }

  if (contentDir === "blog") return "blog";
  if (contentDir === "felieton") return "felieton";

  const slugLower = slug.toLowerCase();
  const titleLower = typeof data.title === "string" ? data.title.toLowerCase() : "";

  if (
    slugLower.startsWith("pierwsza-jazda") ||
    slugLower.includes("pierwsza-jazda") ||
    titleLower.includes("pierwsza jazda")
  ) {
    return "pierwsza-jazda";
  }

  return "test";
}

function parseImport(data: Record<string, unknown>): ImportProvenance | undefined {
  const imp = data.import;
  if (!imp || typeof imp !== "object") {
    const legacy: ImportProvenance = {};
    if (typeof data.importSource === "string") legacy.source = data.importSource as ImportProvenance["source"];
    if (typeof data.importedAt === "string") legacy.importedAt = data.importedAt;
    if (typeof data.sourceId === "string") legacy.sourceId = data.sourceId;
    if (typeof data.sourceFile === "string") legacy.sourceFile = data.sourceFile;
    return Object.keys(legacy).length ? legacy : undefined;
  }
  const o = imp as Record<string, unknown>;
  return {
    source: typeof o.source === "string" ? (o.source as ImportProvenance["source"]) : undefined,
    importedAt: typeof o.importedAt === "string" ? o.importedAt : undefined,
    sourceId: typeof o.sourceId === "string" ? o.sourceId : undefined,
    sourceFile: typeof o.sourceFile === "string" ? o.sourceFile : undefined
  };
}

function mapMeta(
  slug: string,
  contentDir: string,
  data: Record<string, unknown>
): ArticleMeta {
  const title = data.title;
  if (typeof title !== "string" || !title.trim()) {
    throw new Error(`Brak pola title w artykule: ${slug}`);
  }

  const publishedAt = data.publishedAt;
  if (typeof publishedAt !== "string") {
    throw new Error(`Pole publishedAt musi być stringiem ISO w artykule: ${slug}`);
  }

  const category = inferCategory(slug, contentDir, data);
  const statusRaw = data.status;
  const status: PublicationStatus =
    statusRaw === "draft" || statusRaw === "archived" ? statusRaw : "published";

  const brand = typeof data.brand === "string" ? data.brand : undefined;
  const model = typeof data.model === "string" ? data.model : undefined;

  if ((category === "test" || category === "pierwsza-jazda") && (!brand || !model)) {
    throw new Error(`Test/pierwsza jazda wymaga brand i model: ${slug}`);
  }

  return {
    slug,
    title,
    category,
    author: typeof data.author === "string" ? data.author : SITE_AUTHOR.name,
    publishedAt,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    lead: typeof data.lead === "string" ? data.lead : undefined,
    status,
    seoTitle: typeof data.seoTitle === "string" ? data.seoTitle : undefined,
    seoDescription: typeof data.seoDescription === "string" ? data.seoDescription : undefined,
    canonicalUrl: typeof data.canonicalUrl === "string" ? data.canonicalUrl : undefined,
    originalUrl: typeof data.originalUrl === "string" ? data.originalUrl : undefined,
    heroImage: typeof data.heroImage === "string" ? data.heroImage : undefined,
    galleryDir: typeof data.galleryDir === "string" ? data.galleryDir : undefined,
    tags: Array.isArray(data.tags)
      ? (data.tags.filter((t) => typeof t === "string") as string[])
      : undefined,
    brand,
    model,
    generation: typeof data.generation === "string" ? data.generation : undefined,
    year: typeof data.year === "number" ? data.year : undefined,
    version: typeof data.version === "string" ? data.version : undefined,
    bodyType: typeof data.bodyType === "string" ? data.bodyType : undefined,
    drivetrain: typeof data.drivetrain === "string" ? data.drivetrain : undefined,
    engine: typeof data.engine === "string" ? data.engine : undefined,
    power: typeof data.power === "string" ? data.power : undefined,
    torque: typeof data.torque === "string" ? data.torque : undefined,
    gearbox: typeof data.gearbox === "string" ? data.gearbox : undefined,
    heroVideoUrl: typeof data.heroVideoUrl === "string" ? data.heroVideoUrl : undefined,
    heroVideoPoster: typeof data.heroVideoPoster === "string" ? data.heroVideoPoster : undefined,
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : undefined,
    import: parseImport(data),
    contentDir
  };
}

async function readArticleFile(
  contentDir: string,
  slug: string
): Promise<{ data: Record<string, unknown>; content: string; filePath: string }> {
  const dir = path.join(CONTENT_ROOT, contentDir);
  const mdx = path.join(dir, `${slug}.mdx`);
  const md = path.join(dir, `${slug}.md`);

  if (existsSync(mdx)) {
    const fileContents = await fs.readFile(mdx, "utf8");
    const parsed = matter(fileContents);
    return { data: parsed.data as Record<string, unknown>, content: parsed.content, filePath: mdx };
  }
  if (existsSync(md)) {
    const fileContents = await fs.readFile(md, "utf8");
    const parsed = matter(fileContents);
    return { data: parsed.data as Record<string, unknown>, content: parsed.content, filePath: md };
  }
  throw new Error(`Nie znaleziono pliku artykułu: ${slug}`);
}

export async function listArticleFiles(): Promise<
  Array<{ slug: string; contentDir: string }>
> {
  const found: Array<{ slug: string; contentDir: string }> = [];
  const seen = new Set<string>();

  for (const contentDir of SCAN_DIRS) {
    const dir = path.join(CONTENT_ROOT, contentDir);
    if (!existsSync(dir)) continue;

    const entries = await fs.readdir(dir);
    for (const name of entries) {
      if (!name.endsWith(".md") && !name.endsWith(".mdx")) continue;
      if (/^README\.mdx?$/i.test(name)) continue;

      const slug = normalizeSlug(name);
      if (EXCLUDED_SLUGS.has(slug)) continue;

      const key = `${contentDir}:${slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ slug, contentDir });
    }
  }

  return found;
}

export async function getAllArticleMetas(options?: {
  category?: ArticleCategory;
  includeDrafts?: boolean;
}): Promise<ArticleMeta[]> {
  const files = await listArticleFiles();
  const metas: ArticleMeta[] = [];

  for (const { slug, contentDir } of files) {
    try {
      const { data } = await readArticleFile(contentDir, slug);
      const meta = mapMeta(slug, contentDir, data);
      if (!options?.includeDrafts && meta.status !== "published") continue;
      if (options?.category && meta.category !== options.category) continue;
      metas.push(meta);
    } catch {
      /* pomijamy uszkodzone pliki w listingu publicznym */
    }
  }

  return metas.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getAllArticleSlugs(options?: {
  category?: ArticleCategory;
  includeDrafts?: boolean;
}): Promise<string[]> {
  const metas = await getAllArticleMetas(options);
  return metas.map((m) => m.slug);
}

export async function getArticleBySlug(
  slug: string,
  preferredDir?: string
): Promise<Article | null> {
  const dirsToTry = preferredDir
    ? [preferredDir, ...SCAN_DIRS.filter((d) => d !== preferredDir)]
    : [...SCAN_DIRS];

  for (const contentDir of dirsToTry) {
    const filePath = path.join(CONTENT_ROOT, contentDir, `${slug}.mdx`);
    const filePathMd = path.join(CONTENT_ROOT, contentDir, `${slug}.md`);
    if (!existsSync(filePath) && !existsSync(filePathMd)) continue;

    const { data, content } = await readArticleFile(contentDir, slug);
    const meta = mapMeta(slug, contentDir, data);

    const { markdown: cleanedMarkdown, headline } = cleanArticleMarkdown(content, {
      brand: meta.brand ?? "",
      model: meta.model ?? ""
    });
    const wallpapers = hasWallpapersShortcode(cleanedMarkdown);
    const markdownForRender = wallpapers
      ? removeWallpapersShortcode(cleanedMarkdown)
      : cleanedMarkdown;
    const processed = await remark().use(html, { sanitize: false }).process(markdownForRender);
    if (headline) meta.headline = headline;

    let contentHtml = processed.toString();
    if (wallpapers) contentHtml = stripWallpapersFromHtml(contentHtml);

    return { meta, contentHtml, ...(wallpapers ? { wallpapers: true } : {}) };
  }

  return null;
}

export function getArticleUrl(meta: ArticleMeta, siteUrl: string): string {
  if (meta.canonicalUrl?.startsWith("http")) return meta.canonicalUrl;
  return `${siteUrl}${articlePublicPath(meta.category, meta.slug)}`;
}

/** Szacowany czas czytania (słowa / 200 sł/min), min. 1 min. */
export function estimateReadingMinutes(contentHtml: string): number {
  const text = contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 200));
}

export async function getRelatedArticlesByBrand(
  slug: string,
  brand: string,
  limit = 3
): Promise<ArticleMeta[]> {
  const brandNorm = brand.trim().toLowerCase();
  const all = await getAllArticleMetas();
  return all
    .filter(
      (a) =>
        a.slug !== slug &&
        a.brand &&
        a.brand.trim().toLowerCase() === brandNorm &&
        (a.category === "test" || a.category === "pierwsza-jazda")
    )
    .slice(0, limit);
}

export { CATEGORY_CONTENT_DIRS };
