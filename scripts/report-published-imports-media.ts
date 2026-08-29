/**
 * Raport: opublikowane importy aG bez lokalnych mediów + dostępność cache.
 * npx tsx scripts/report-published-imports-media.ts
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const IMG_ROOT = path.join(ROOT, "content", "import", "autogaleria", "images");
const REPORT = path.join(ROOT, "content", "import", "autogaleria", "published-imports-media-report.json");
const DIRS = ["testy", "blog", "felieton", "news"] as const;

async function countCacheImages(slug: string): Promise<number> {
  const dir = path.join(IMG_ROOT, slug);
  if (!existsSync(dir)) return 0;
  let n = 0;
  async function walk(d: string): Promise<void> {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (/\.(jpe?g|png|gif|webp)$/i.test(e.name)) n += 1;
    }
  }
  await walk(dir);
  return n;
}

async function main(): Promise<void> {
  const manifest = existsSync(path.join(ROOT, "src/data/galleries-manifest.json"))
    ? (JSON.parse(await fs.readFile(path.join(ROOT, "src/data/galleries-manifest.json"), "utf8")) as Record<
        string,
        unknown[]
      >)
    : {};

  const publishedNoMedia: Array<Record<string, unknown>> = [];
  const publishedWithMedia: Array<Record<string, unknown>> = [];
  const draftImports: Array<Record<string, unknown>> = [];

  for (const dir of DIRS) {
    const full = path.join(ROOT, "content", dir);
    if (!existsSync(full)) continue;
    for (const file of (await fs.readdir(full)).filter((f) => f.endsWith(".mdx"))) {
      const filePath = path.join(full, file);
      const { data } = matter(await fs.readFile(filePath, "utf8"));
      const imp = data.import as { source?: string } | undefined;
      if (!imp || imp.source !== "autogaleria") continue;

      const slug = file.replace(/\.mdx$/, "");
      const status = String(data.status ?? "published");
      const gdir = String(data.galleryDir ?? "").replace(/^galleries[\\/]/, "");
      const hasGallery = !!(gdir && manifest[gdir]?.length);
      const hasHero = !!(data.heroImage && String(data.heroImage).trim());
      const hasMedia = hasGallery || hasHero;
      const cacheImages = await countCacheImages(slug);
      const item = {
        slug,
        dir,
        status,
        category: data.category ?? dir,
        hasMedia,
        galleryDir: data.galleryDir ?? null,
        heroImage: data.heroImage ?? null,
        cacheImages,
        deployable: cacheImages >= 2 && !hasGallery,
        recommendation:
          status === "published" && !hasMedia
            ? cacheImages >= 2
              ? "deploy-gallery-from-cache"
              : dir === "felieton"
                ? "keep-published-text-only"
                : "set-draft-no-media"
            : hasMedia
              ? "ok"
              : cacheImages >= 2
                ? "deploy-when-ready"
                : "draft-ok"
      };

      if (status === "published" && !hasMedia) publishedNoMedia.push(item);
      else if (status === "published") publishedWithMedia.push(item);
      else draftImports.push(item);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    counts: {
      publishedTotal: publishedNoMedia.length + publishedWithMedia.length,
      publishedNoMedia: publishedNoMedia.length,
      publishedWithMedia: publishedWithMedia.length,
      draftImports: draftImports.length,
      deployableFromCache: [...publishedNoMedia, ...draftImports].filter((i) => i.deployable).length
    },
    publishedNoMedia,
    publishedWithMedia,
    draftImports
  };

  await fs.writeFile(REPORT, JSON.stringify(report, null, 2), "utf8");
  console.log(`Published bez mediów: ${publishedNoMedia.length}`);
  console.log(`Published z mediami: ${publishedWithMedia.length}`);
  console.log(`Draft importów: ${draftImports.length}`);
  console.log(`Deployable z cache: ${report.counts.deployableFromCache}`);
  console.log(path.relative(ROOT, REPORT));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
