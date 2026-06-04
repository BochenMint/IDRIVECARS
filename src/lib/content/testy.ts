import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import type { GalleryImage } from "./gallery";
import type { Test, TestMeta } from "./types";
import { cleanArticleMarkdown } from "./html";

/** Wstawia pojedyncze zdjęcia z galerii co kilka akapitów w HTML treści (max 4 zdjęcia). */
export function injectInlineGalleryImages(
  contentHtml: string,
  images: GalleryImage[],
  options: { everyNParagraphs?: number; maxImages?: number } = {}
): string {
  const { everyNParagraphs = 2, maxImages = 4 } = options;
  if (images.length === 0) return contentHtml;

  const regex = /<\/p>/g;
  let result = contentHtml;
  let paragraphIndex = 0;
  let imagesUsed = 0;
  let offset = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(contentHtml)) !== null) {
    paragraphIndex++;
    if (
      paragraphIndex % everyNParagraphs === 0 &&
      imagesUsed < maxImages &&
      images[imagesUsed]
    ) {
      const img = images[imagesUsed];
      const figureHtml = `<figure class="article-inline-image my-10"><img src="${img.src}" alt="${escapeHtml(img.alt)}" loading="lazy" class="w-full" /></figure>`;
      result =
        result.slice(0, match.index + offset + 4) +
        figureHtml +
        result.slice(match.index + offset + 4);
      offset += figureHtml.length;
      imagesUsed++;
    }
  }

  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TESTS_DIR = path.join(process.cwd(), "content", "testy");

function normalizeSlug(filename: string): string {
  return filename.replace(/\.mdx?$/, "");
}

function mapMeta(slug: string, data: Record<string, unknown>): TestMeta {
  const {
    title,
    brand,
    model,
    generation,
    year,
    version,
    publishedAt,
    lead,
    originalUrl,
    heroImage,
    galleryDir,
    tags,
    bodyType,
    drivetrain,
    engine,
    power,
    torque,
    gearbox,
    heroVideoUrl,
    heroVideoPoster,
    videoUrl
  } = data;

  if (typeof title !== "string" || typeof brand !== "string" || typeof model !== "string") {
    throw new Error(`Brak wymaganych pól meta w teście: ${slug}`);
  }

  if (typeof publishedAt !== "string") {
    throw new Error(`Pole publishedAt musi być stringiem (ISO) w teście: ${slug}`);
  }

  return {
    slug,
    title,
    brand,
    model,
    generation: typeof generation === "string" ? generation : undefined,
    year: typeof year === "number" ? year : undefined,
    version: typeof version === "string" ? version : undefined,
    publishedAt,
    lead: typeof lead === "string" ? lead : undefined,
    originalUrl: typeof originalUrl === "string" ? originalUrl : undefined,
    heroImage: typeof heroImage === "string" ? heroImage : undefined,
    galleryDir: typeof galleryDir === "string" ? galleryDir : undefined,
    tags: Array.isArray(tags) ? (tags.filter((t) => typeof t === "string") as string[]) : undefined,
    bodyType: typeof bodyType === "string" ? bodyType : undefined,
    drivetrain: typeof drivetrain === "string" ? drivetrain : undefined,
    engine: typeof engine === "string" ? engine : undefined,
    power: typeof power === "string" ? power : undefined,
    torque: typeof torque === "string" ? torque : undefined,
    gearbox: typeof gearbox === "string" ? gearbox : undefined,
    heroVideoUrl: typeof heroVideoUrl === "string" ? heroVideoUrl : undefined,
    heroVideoPoster: typeof heroVideoPoster === "string" ? heroVideoPoster : undefined,
    videoUrl: typeof videoUrl === "string" ? videoUrl : undefined
  };
}

export async function getAllTestSlugs(): Promise<string[]> {
  const entries = await fs.readdir(TESTS_DIR);
  return entries
    .filter(
      (name) =>
        (name.endsWith(".md") || name.endsWith(".mdx")) &&
        !/^README\.mdx?$/i.test(name) &&
        !/^przykladowy-test\.mdx?$/i.test(name)
    )
    .map((name) => normalizeSlug(name));
}

/** Szacowany czas czytania (słowa / 200 sł/min), min. 1 min. */
export function estimateReadingMinutes(contentHtml: string): number {
  const text = contentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 200));
}

export async function getRelatedTestsByBrand(
  slug: string,
  brand: string,
  limit = 3
): Promise<TestMeta[]> {
  const brandNorm = brand.trim().toLowerCase();
  const all = await getAllTests();
  return all
    .filter((t) => t.slug !== slug && t.brand.trim().toLowerCase() === brandNorm)
    .slice(0, limit);
}

export async function getAllTests(): Promise<TestMeta[]> {
  const slugs = await getAllTestSlugs();

  const tests = await Promise.all(
    slugs.map(async (slug) => {
      let fileContents: string;
      try {
        fileContents = await fs.readFile(path.join(TESTS_DIR, `${slug}.mdx`), "utf8");
      } catch {
        fileContents = await fs.readFile(path.join(TESTS_DIR, `${slug}.md`), "utf8");
      }
      const { data } = matter(fileContents);
      return mapMeta(slug, data);
    })
  );

  return tests.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getTestBySlug(slug: string): Promise<Test> {
  const fullPathMdx = path.join(TESTS_DIR, `${slug}.mdx`);
  const fullPathMd = path.join(TESTS_DIR, `${slug}.md`);

  let fileContents: string;

  try {
    fileContents = await fs.readFile(fullPathMdx, "utf8");
  } catch {
    fileContents = await fs.readFile(fullPathMd, "utf8");
  }

  const { data, content } = matter(fileContents);
  const meta = mapMeta(slug, data);

  const { markdown: cleanedMarkdown, headline } = cleanArticleMarkdown(content, {
    brand: meta.brand,
    model: meta.model
  });
  const processed = await remark().use(html, { sanitize: false }).process(cleanedMarkdown);
  const contentHtml = processed.toString();

  if (headline) {
    meta.headline = headline;
  }

  return {
    meta,
    contentHtml
  };
}

