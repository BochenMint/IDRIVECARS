/**
 * Konwersja galerii do WebP z wariantami responsive + SEO alt text.
 * Oryginały na D:\MARCIN pozostają nietknięte.
 *
 * Uruchom:
 *   npx tsx scripts/convert-galleries-responsive.ts                    # wszystkie z gallery-links
 *   npx tsx scripts/convert-galleries-responsive.ts porsche-911-targa-tapety mercedes-amg-gt-s
 *   npx tsx scripts/convert-galleries-responsive.ts --dry-run porsche-911-targa-tapety
 *
 * Env:
 *   WEBP_QUALITY=82   (domyślnie 82)
 *   WEBP_EFFORT=4
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";

type GalleryEntry = { sourceFolder: string; outputSlug: string };

type GalleryLinksConfig = {
  sourcesRoot: string;
  extraSources?: Record<string, string>;
  galleries: GalleryEntry[];
  articleToGallery?: Record<string, string>;
};

type ArticleMeta = { slug: string; title: string; brand: string; model: string };

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const OUT_BASE = path.join(process.cwd(), "public", "galleries");

const WIDTHS = [
  { suffix: "", maxWidth: 1920 },
  { suffix: "-1200", maxWidth: 1200 },
  { suffix: "-800", maxWidth: 800 },
  { suffix: "-480", maxWidth: 480 }
] as const;

const QUALITY = Number(process.env.WEBP_QUALITY ?? 82);
const EFFORT = Number(process.env.WEBP_EFFORT ?? 4);
const DRY_RUN = process.argv.includes("--dry-run");
const slugArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function isImageFile(file: string): boolean {
  const lower = file.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}

function seoBaseName(raw: string, article?: ArticleMeta, index?: number): string {
  const slugPart = article
    ? `${article.brand}-${article.model}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
    : raw;
  const idx = index !== undefined ? `-${String(index + 1).padStart(2, "0")}` : "";
  const cleaned = raw
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (cleaned.length >= 6 && !/^img[-_]?\d+$/i.test(cleaned)) return cleaned;
  return `${slugPart}${idx}`;
}

function altText(article: ArticleMeta | undefined, baseName: string, index: number): string {
  if (article) {
    return `${article.brand} ${article.model} — zdjęcie ${index + 1} (${article.title})`;
  }
  return baseName.replace(/-/g, " ");
}

async function loadArticleByGallerySlug(gallerySlug: string): Promise<ArticleMeta | undefined> {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as GalleryLinksConfig;
  const articleSlug = Object.entries(config.articleToGallery ?? {}).find(([, g]) => g === gallerySlug)?.[0];
  const slug = articleSlug ?? gallerySlug;
  const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!existsSync(mdxPath)) return undefined;
  const { data } = matter(await fs.readFile(mdxPath, "utf8"));
  return {
    slug,
    title: String(data.title ?? slug),
    brand: String(data.brand ?? ""),
    model: String(data.model ?? "")
  };
}

async function* walkImages(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(fullPath);
    else if (entry.isFile() && isImageFile(entry.name)) yield fullPath;
  }
}

async function resolveFolderName(sourcesRoot: string, folderName: string): Promise<string | null> {
  const direct = path.join(sourcesRoot, folderName);
  if (existsSync(direct)) return direct;
  const surowe = path.join(sourcesRoot, "SUROWE", folderName);
  if (existsSync(surowe)) return surowe;
  const entries = await fs.readdir(sourcesRoot, { withFileTypes: true });
  const normalized = folderName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const n = e.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (n === normalized || n.includes(normalized.slice(0, 12)) || normalized.includes(n.slice(0, 12))) {
      return path.join(sourcesRoot, e.name);
    }
  }
  return null;
}

async function convertFolder(srcDir: string, outputSlug: string): Promise<number> {
  const article = await loadArticleByGallerySlug(outputSlug);
  const destDir = path.join(OUT_BASE, outputSlug);
  if (!DRY_RUN) await fs.mkdir(destDir, { recursive: true });

  let count = 0;
  let index = 0;
  for await (const srcPath of walkImages(srcDir)) {
    const rawBase = path.basename(srcPath, path.extname(srcPath));
    const seoName = seoBaseName(rawBase, article, index);
    const alt = altText(article, seoName, index);
    let wroteAnyVariant = false;

    for (const { suffix, maxWidth } of WIDTHS) {
      const destPath = path.join(destDir, `${seoName}${suffix}.webp`);
      if (DRY_RUN) {
        console.log(`  [dry] ${path.basename(srcPath)} → ${seoName}${suffix}.webp`);
        continue;
      }
      try {
        const meta = await sharp(srcPath).metadata();
        const w = meta.width ?? maxWidth;
        const pipeline = sharp(srcPath).rotate();
        if (w > maxWidth) pipeline.resize({ width: maxWidth, withoutEnlargement: true });
        await pipeline.webp({ quality: QUALITY, effort: EFFORT }).toFile(destPath);
        wroteAnyVariant = true;
      } catch (error) {
        console.warn(`  ! ${outputSlug}: pominięto ${path.basename(srcPath)} (${String(error)})`);
      }
    }

    if (!DRY_RUN && wroteAnyVariant) {
      const metaPath = path.join(destDir, `${seoName}.meta.json`);
      await fs.writeFile(
        metaPath,
        JSON.stringify({ alt, source: srcPath, slug: outputSlug, article: article?.slug }, null, 0),
        "utf8"
      );
    }

    count += 1;
    index += 1;
    if (count % 10 === 0) console.log(`  … ${outputSlug}: ${count} zdj.`);
  }

  return count;
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as GalleryLinksConfig;
  const targetSlugs = slugArgs.length ? new Set(slugArgs) : null;

  const jobs: Array<{ srcDir: string; outputSlug: string }> = [];

  for (const entry of config.galleries) {
    if (targetSlugs && !targetSlugs.has(entry.outputSlug)) continue;
    const srcDir = await resolveFolderName(config.sourcesRoot, entry.sourceFolder);
    if (srcDir) jobs.push({ srcDir, outputSlug: entry.outputSlug });
  }

  if (config.extraSources) {
    for (const [srcDir, outputSlug] of Object.entries(config.extraSources)) {
      if (targetSlugs && !targetSlugs.has(outputSlug)) continue;
      if (existsSync(srcDir)) jobs.push({ srcDir, outputSlug });
    }
  }

  const seen = new Set<string>();
  const uniqueJobs = jobs.filter((j) => {
    if (seen.has(j.outputSlug)) return false;
    seen.add(j.outputSlug);
    return true;
  });

  if (!uniqueJobs.length) {
    console.warn("Brak galerii do konwersji. Podaj slugi: porsche-911-targa-tapety mercedes-amg-gt-s");
    return;
  }

  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Konwersja ${uniqueJobs.length} galerii → public/galleries/`);
  let total = 0;
  for (const job of uniqueJobs) {
    const n = await convertFolder(job.srcDir, job.outputSlug);
    console.log(`✓ ${job.outputSlug}: ${n} zdj. ← ${path.basename(job.srcDir)}`);
    total += n;
  }
  console.log(`\nGotowe: ${total} źródeł, warianty: ${WIDTHS.map((w) => w.maxWidth).join(", ")}px`);
  if (!DRY_RUN) console.log("Następnie: npm run curate:galleries && npm run generate:galleries-manifest");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
