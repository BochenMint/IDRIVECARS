/**
 * Bezpieczny deploy galerii z cache importu aG → public/galleries/{slug}.
 * Ustawia galleryDir w MDX. Nie uruchamia curate (unikanie locków z workerem mediów).
 *
 * npx tsx scripts/deploy-autogaleria-galleries.ts --dry-run
 * npx tsx scripts/deploy-autogaleria-galleries.ts --published-only
 * npx tsx scripts/deploy-autogaleria-galleries.ts --draft-only
 * npx tsx scripts/deploy-autogaleria-galleries.ts --slug choroba-zwana-predkoscia
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";

const ROOT = process.cwd();
const IMG_ROOT = path.join(ROOT, "content", "import", "autogaleria", "images");
const OUT_BASE = path.join(ROOT, "public", "galleries");
const MANIFEST_PATH = path.join(ROOT, "src", "data", "galleries-manifest.json");
const REPORT_PATH = path.join(ROOT, "content", "import", "autogaleria", "gallery-deploy-report.json");

const CONTENT_DIRS = ["testy", "blog", "felieton", "news"] as const;
const MIN_IMAGES = 2;
const MAX_IMAGES = 20;
const WIDTHS = [
  { suffix: "", maxWidth: 1920 },
  { suffix: "-1200", maxWidth: 1200 },
  { suffix: "-800", maxWidth: 800 },
  { suffix: "-480", maxWidth: 480 }
] as const;
const QUALITY = Number(process.env.WEBP_QUALITY ?? 82);

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLISHED_ONLY = process.argv.includes("--published-only");
const DRAFT_ONLY = process.argv.includes("--draft-only");
const slugFilter = new Set(
  process.argv.filter((a) => /^[a-z0-9][a-z0-9-]*$/i.test(a) && a.length > 3)
);

type ArticleRef = {
  slug: string;
  dir: string;
  filePath: string;
  status: string;
  title: string;
  brand: string;
  model: string;
};

type DeployResult = {
  slug: string;
  status: "deployed" | "skipped" | "error";
  reason?: string;
  images?: number;
  galleryDir?: string;
  mdxUpdated?: boolean;
};

function isImage(name: string): boolean {
  return /\.(jpe?g|png|gif|webp)$/i.test(name);
}

async function listImages(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listImages(full)));
    else if (entry.isFile() && isImage(entry.name)) out.push(full);
  }
  return out.sort();
}

function seoName(raw: string, article: ArticleRef, index: number): string {
  const base = `${article.brand}-${article.model}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const idx = String(index + 1).padStart(2, "0");
  const cleaned = raw
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (cleaned.length >= 6 && !/^img[-_]?\d+$/i.test(cleaned)) return cleaned;
  return `${base || article.slug}-${idx}`;
}

function altText(article: ArticleRef, index: number): string {
  return `${article.brand} ${article.model} — zdjęcie ${index + 1} (${article.title})`.trim();
}

function rewriteMdx(data: Record<string, unknown>, content: string): string {
  return matter.stringify(content, data);
}

async function findArticles(): Promise<ArticleRef[]> {
  const articles: ArticleRef[] = [];
  for (const dir of CONTENT_DIRS) {
    const full = path.join(ROOT, "content", dir);
    if (!existsSync(full)) continue;
    for (const file of (await fs.readdir(full)).filter((f) => f.endsWith(".mdx"))) {
      const filePath = path.join(full, file);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = matter(raw);
      const data = parsed.data as Record<string, unknown>;
      const imp = data.import as { source?: string } | undefined;
      if (!imp || imp.source !== "autogaleria") continue;

      const slug = file.replace(/\.mdx$/, "");
      const status = String(data.status ?? "published");
      if (PUBLISHED_ONLY && status !== "published") continue;
      if (DRAFT_ONLY && status === "published") continue;
      if (slugFilter.size && !slugFilter.has(slug)) continue;

      articles.push({
        slug,
        dir,
        filePath,
        status,
        title: String(data.title ?? slug),
        brand: String(data.brand ?? ""),
        model: String(data.model ?? "")
      });
    }
  }
  return articles;
}

function hasValidGallery(slug: string, galleryDir: unknown, manifest: Record<string, unknown[]>): boolean {
  const g = typeof galleryDir === "string" ? galleryDir.replace(/^galleries[\\/]/, "") : "";
  if (g && manifest[g]?.length) return true;
  if (manifest[slug]?.length) return true;
  return existsSync(path.join(OUT_BASE, slug)) && existsSync(path.join(OUT_BASE, g || slug));
}

async function deployGallery(article: ArticleRef, manifest: Record<string, unknown[]>): Promise<DeployResult> {
  const cacheDir = path.join(IMG_ROOT, article.slug);
  const outDir = path.join(OUT_BASE, article.slug);

  const raw = await fs.readFile(article.filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const gdir = data.galleryDir;

  if (hasValidGallery(article.slug, gdir, manifest)) {
    return { slug: article.slug, status: "skipped", reason: "galeria już podpięta" };
  }

  const sources = await listImages(cacheDir);
  if (sources.length < MIN_IMAGES) {
    return {
      slug: article.slug,
      status: "skipped",
      reason: `za mało obrazów w cache (${sources.length} < ${MIN_IMAGES})`
    };
  }

  const picked = sources.slice(0, MAX_IMAGES);
  if (DRY_RUN) {
    return {
      slug: article.slug,
      status: "deployed",
      reason: "dry-run",
      images: picked.length,
      galleryDir: `galleries/${article.slug}`
    };
  }

  try {
    await fs.mkdir(outDir, { recursive: true });
    let index = 0;
    for (const srcPath of picked) {
      const name = seoName(path.basename(srcPath), article, index);
      const alt = altText(article, index);
      for (const { suffix, maxWidth } of WIDTHS) {
        const destPath = path.join(outDir, `${name}${suffix}.webp`);
        if (existsSync(destPath)) continue;
        const meta = await sharp(srcPath).metadata();
        const w = meta.width ?? maxWidth;
        const pipeline = sharp(srcPath).rotate();
        if (w > maxWidth) pipeline.resize({ width: maxWidth, withoutEnlargement: true });
        await pipeline.webp({ quality: QUALITY }).toFile(destPath);
      }
      const metaPath = path.join(outDir, `${name}.meta.json`);
      if (!existsSync(metaPath)) {
        await fs.writeFile(
          metaPath,
          JSON.stringify({ alt, source: srcPath, slug: article.slug }, null, 0),
          "utf8"
        );
      }
      index += 1;
    }

    const rawAfter = await fs.readFile(article.filePath, "utf8");
    const parsedAfter = matter(rawAfter);
    const dataAfter = parsedAfter.data as Record<string, unknown>;
    const newGalleryDir = `galleries/${article.slug}`;
    let mdxUpdated = false;
    if (dataAfter.galleryDir !== newGalleryDir) {
      dataAfter.galleryDir = newGalleryDir;
      mdxUpdated = true;
      await fs.writeFile(article.filePath, rewriteMdx(dataAfter, parsedAfter.content), "utf8");
    }

    return {
      slug: article.slug,
      status: "deployed",
      images: picked.length,
      galleryDir: newGalleryDir,
      mdxUpdated
    };
  } catch (error) {
    return { slug: article.slug, status: "error", reason: String(error) };
  }
}

async function main(): Promise<void> {
  const manifest = existsSync(MANIFEST_PATH)
    ? (JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as Record<string, unknown[]>)
    : {};

  const articles = await findArticles();
  console.log(
    `${DRY_RUN ? "[dry-run] " : ""}Deploy cache aG → public/galleries (${articles.length} kandydatów)`
  );

  const results: DeployResult[] = [];
  for (const article of articles) {
    const result = await deployGallery(article, manifest);
    results.push(result);
    const icon = result.status === "deployed" ? "✓" : result.status === "skipped" ? "·" : "!";
    console.log(
      `  ${icon} ${article.dir}/${article.slug}: ${result.status}${result.reason ? ` — ${result.reason}` : ""}${result.images ? ` (${result.images} zdj.)` : ""}`
    );
  }

  const deployed = results.filter((r) => r.status === "deployed");
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    publishedOnly: PUBLISHED_ONLY,
    draftOnly: DRAFT_ONLY,
    slugFilter: [...slugFilter],
    summary: {
      candidates: articles.length,
      deployed: deployed.length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length
    },
    results
  };

  if (!DRY_RUN) {
    await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    if (deployed.length) {
      console.log("\nRegeneracja manifestu galerii…");
      const { spawnSync } = await import("node:child_process");
      spawnSync("npm", ["run", "generate:galleries-manifest"], { cwd: ROOT, stdio: "inherit", shell: true });
    }
  }

  console.log(`\nPodsumowanie: ${deployed.length} deployed, ${report.summary.skipped} skipped, ${report.summary.errors} errors`);
  console.log(path.relative(ROOT, REPORT_PATH));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
