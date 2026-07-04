/**
 * Readonly inventory D:\MARCIN + manifest parowania z artykułami idrivecars.
 * Uruchom: npx tsx scripts/inventory-marcin-media.ts
 * Opcje: --refresh (pełny skan), --priority (tylko artykuły priorytetowe)
 */

import fs from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const MARCIN_ROOT = "D:\\MARCIN";
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const GALLERY_LINKS = path.join(process.cwd(), "scripts", "gallery-links.json");
const OUT_INVENTORY = path.join(process.cwd(), "scripts", "data", "marcin-inventory.json");
const OUT_MANIFEST = path.join(process.cwd(), "scripts", "data", "media-pairing-manifest.json");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".cr2", ".nef", ".arw"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".avi", ".m4v", ".webm"]);
const AUDIO_EXT = new Set([".mp3", ".wav", ".aac", ".m4a", ".ogg"]);
const DOC_EXT = new Set([".docx", ".doc", ".pdf", ".rtf", ".odt", ".gdoc"]);

const PRIORITY_SLUGS = [
  "rolls-royce-wraith",
  "porsche-911-targa-4s",
  "porsche-911-targa-4s-dane-techniczne",
  "porsche-boxster-s",
  "bmw-435i",
  "bmw-435i-cabriolet",
  "bmw-328i-xdrive-niech-zyje-dynamika",
  "maserati-granturismo-sport",
  "mercedes-c200",
  "mercedes-amg-gt-s",
  "test-mercedes-amg-gt-s-testujemy-rywala-911",
  "lexus-rx-350-f-sport",
  "lexus-rx"
];

type FileCounts = { images: number; raw: number; videos: number; audio: number; docs: number; other: number };

type FolderEntry = {
  path: string;
  rel: string;
  counts: FileCounts;
  modified?: string;
};

type ArticleMeta = {
  slug: string;
  title: string;
  brand: string;
  model: string;
  galleryDir?: string;
};

type Candidate = {
  path: string;
  rel: string;
  type: "image_folder" | "video" | "document";
  count?: number;
  score: number;
  reason: string;
};

type PairingEntry = {
  slug: string;
  title: string;
  brand: string;
  model: string;
  gallerySlug?: string;
  imageCandidates: Candidate[];
  videoCandidates: Candidate[];
  documentCandidates: Candidate[];
  confidence: "high" | "medium" | "low" | "none";
  notes: string[];
};

type GalleryLinksConfig = {
  articleToGallery?: Record<string, string>;
  galleries?: Array<{ sourceFolder: string; outputSlug: string }>;
  extraSources?: Record<string, string>;
  manualFolderMatches?: Record<string, string>;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function slugTokens(slug: string): string[] {
  const stop = new Set(["pierwsza", "jazda", "test", "nowy", "nowa", "dane", "techniczne"]);
  return slug
    .split("-")
    .filter((t) => t.length >= 2 && !stop.has(t));
}

function folderScore(folderNorm: string, folderName: string, article: ArticleMeta): number {
  let score = 0;
  const slugNorm = normalize(article.slug);
  const titleNorm = normalize(article.title);
  const brandNorm = normalize(article.brand);
  const modelNorm = normalize(article.model);

  if (folderNorm.includes(slugNorm.slice(0, Math.min(12, slugNorm.length)))) score += 40;
  if (folderNorm.includes(titleNorm.slice(0, 14))) score += 35;
  if (brandNorm.length >= 3 && folderNorm.includes(brandNorm)) score += 15;
  if (modelNorm.length >= 3 && folderNorm.includes(modelNorm)) score += 25;

  for (const tok of slugTokens(article.slug)) {
    if (tok.length >= 3 && folderNorm.includes(tok)) score += 8;
  }

  const nameNorm = normalize(folderName);
  if (nameNorm === modelNorm) score += 30;
  if (titleNorm.includes(nameNorm) || nameNorm.includes(modelNorm)) score += 20;

  return score;
}

function extOf(name: string): string {
  return path.extname(name).toLowerCase();
}

async function loadArticles(filterSlugs?: Set<string>): Promise<ArticleMeta[]> {
  const files = await fs.readdir(CONTENT_DIR);
  const articles: ArticleMeta[] = [];
  for (const f of files) {
    if (!f.endsWith(".mdx")) continue;
    const slug = f.replace(/\.mdx$/, "");
    if (filterSlugs && !filterSlugs.has(slug)) continue;
    const raw = await fs.readFile(path.join(CONTENT_DIR, f), "utf8");
    const { data } = matter(raw);
    articles.push({
      slug,
      title: String(data.title ?? slug),
      brand: String(data.brand ?? ""),
      model: String(data.model ?? ""),
      galleryDir: data.galleryDir ? String(data.galleryDir) : undefined
    });
  }
  return articles;
}

async function scanMarcin(maxDepth = 6): Promise<{
  summary: Record<string, number>;
  topFolders: FolderEntry[];
  videoFiles: Array<{ path: string; rel: string; sizeMb: number }>;
  docFiles: Array<{ path: string; rel: string; titleGuess: string }>;
  scannedAt: string;
}> {
  const summary: Record<string, number> = {
    images_jpg: 0,
    images_raw: 0,
    videos: 0,
    audio: 0,
    documents: 0,
    total_files: 0
  };

  const folderMap = new Map<string, FileCounts>();
  const videoFiles: Array<{ path: string; rel: string; sizeMb: number }> = [];
  const docFiles: Array<{ path: string; rel: string; titleGuess: string }> = [];

  async function walk(dir: string, depth: number, rel: string): Promise<void> {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const e of entries) {
      const full = path.join(dir, e.name);
      const childRel = rel ? `${rel}\\${e.name}` : e.name;

      if (e.isDirectory()) {
        if (["node_modules", ".git", "$RECYCLE.BIN"].includes(e.name)) continue;
        await walk(full, depth + 1, childRel);
        continue;
      }

      if (!e.isFile()) continue;
      summary.total_files += 1;
      const ext = extOf(e.name);
      const key = rel.split("\\")[0] ?? rel;
      const counts = folderMap.get(key) ?? {
        images: 0,
        raw: 0,
        videos: 0,
        audio: 0,
        docs: 0,
        other: 0
      };

      if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp") {
        summary.images_jpg += 1;
        counts.images += 1;
      } else if (ext === ".cr2" || ext === ".nef" || ext === ".arw") {
        summary.images_raw += 1;
        counts.raw += 1;
      } else if (VIDEO_EXT.has(ext)) {
        summary.videos += 1;
        counts.videos += 1;
        try {
          const st = statSync(full);
          videoFiles.push({
            path: full,
            rel: childRel,
            sizeMb: Math.round((st.size / 1024 / 1024) * 10) / 10
          });
        } catch {
          /* skip */
        }
      } else if (AUDIO_EXT.has(ext)) {
        summary.audio += 1;
        counts.audio += 1;
      } else if (DOC_EXT.has(ext)) {
        summary.documents += 1;
        counts.docs += 1;
        docFiles.push({
          path: full,
          rel: childRel,
          titleGuess: path.basename(e.name, ext)
        });
      } else {
        counts.other += 1;
      }
      folderMap.set(key, counts);
    }
  }

  await walk(MARCIN_ROOT, 0, "");

  const topFolders: FolderEntry[] = [];
  for (const [name, counts] of folderMap) {
    const fullPath = path.join(MARCIN_ROOT, name);
    let modified: string | undefined;
    try {
      modified = statSync(fullPath).mtime.toISOString().slice(0, 10);
    } catch {
      /* skip */
    }
    topFolders.push({ path: fullPath, rel: name, counts, modified });
  }

  topFolders.sort(
    (a, b) =>
      b.counts.images +
      b.counts.raw +
      b.counts.videos -
      (a.counts.images + a.counts.raw + a.counts.videos)
  );

  return {
    summary,
    topFolders: topFolders.slice(0, 40),
    videoFiles: videoFiles.sort((a, b) => b.sizeMb - a.sizeMb).slice(0, 200),
    docFiles: docFiles.slice(0, 500),
    scannedAt: new Date().toISOString()
  };
}

async function loadPhotoFolders(): Promise<
  Array<{ fullPath: string; name: string; relFromMarcin: string; jpg: number; norm: string }>
> {
  const cache = path.join(process.cwd(), "scripts", "data", "discovered-photo-folders.json");
  if (!existsSync(cache)) return [];
  const raw = await fs.readFile(cache, "utf8");
  return JSON.parse(raw);
}

function confidenceFromScore(best: number, linkedGallery?: string): PairingEntry["confidence"] {
  if (linkedGallery) return "high";
  if (best >= 60) return "high";
  if (best >= 35) return "medium";
  if (best >= 15) return "low";
  return "none";
}

async function buildPairingManifest(
  articles: ArticleMeta[],
  inventory: Awaited<ReturnType<typeof scanMarcin>>,
  galleryConfig: GalleryLinksConfig,
  photoFolders: Awaited<ReturnType<typeof loadPhotoFolders>>
): Promise<PairingEntry[]> {
  const articleToGallery = galleryConfig.articleToGallery ?? {};
  const manual = galleryConfig.manualFolderMatches ?? {};
  const galleryByOutput = new Map(
    (galleryConfig.galleries ?? []).map((g) => [g.outputSlug, g.sourceFolder])
  );
  const extraSourceByOutput = new Map(
    Object.entries(galleryConfig.extraSources ?? {}).map(([src, outputSlug]) => [outputSlug, src])
  );

  const folderCandidates: Array<{ path: string; rel: string; norm: string; name: string; jpg: number }> =
    photoFolders.map((f) => ({
      path: f.fullPath,
      rel: f.relFromMarcin,
      norm: f.norm,
      name: f.name,
      jpg: f.jpg
    }));

  return articles.map((article) => {
    const notes: string[] = [];
    const gallerySlug = articleToGallery[article.slug] ?? article.galleryDir?.replace(/^galleries\//, "");
    const imageCandidates: Candidate[] = [];
    const videoCandidates: Candidate[] = [];
    const documentCandidates: Candidate[] = [];

    if (gallerySlug) {
      const srcFolder = galleryByOutput.get(gallerySlug);
      const extraSrc = extraSourceByOutput.get(gallerySlug);
      notes.push(`gallery-links: ${gallerySlug}${srcFolder || extraSrc ? ` ← ${srcFolder ?? extraSrc}` : ""}`);
      if (extraSrc) {
        imageCandidates.push({
          path: extraSrc,
          rel: path.relative(MARCIN_ROOT, extraSrc),
          type: "image_folder",
          score: 100,
          reason: "extraSources"
        });
      }
    }

    if (manual[article.slug]) {
      imageCandidates.push({
        path: manual[article.slug],
        rel: path.relative(MARCIN_ROOT, manual[article.slug]),
        type: "image_folder",
        score: 100,
        reason: "manualFolderMatches"
      });
    }

    for (const folder of folderCandidates) {
      const score = folderScore(folder.norm, folder.name, article);
      if (score >= 12) {
        imageCandidates.push({
          path: folder.path,
          rel: folder.rel,
          type: "image_folder",
          count: folder.jpg,
          score,
          reason: `folder match (${folder.name})`
        });
      }
    }

    for (const vid of inventory.videoFiles) {
      const vidNorm = normalize(vid.rel);
      const score = folderScore(vidNorm, path.basename(vid.path), article);
      if (score >= 20) {
        videoCandidates.push({
          path: vid.path,
          rel: vid.rel,
          type: "video",
          score,
          reason: `video filename/path match`
        });
      }
    }

    for (const doc of inventory.docFiles) {
      const docNorm = normalize(doc.titleGuess + doc.rel);
      const score = folderScore(docNorm, doc.titleGuess, article);
      if (score >= 25) {
        documentCandidates.push({
          path: doc.path,
          rel: doc.rel,
          type: "document",
          score,
          reason: `document title match`
        });
      }
    }

    imageCandidates.sort((a, b) => b.score - a.score);
    videoCandidates.sort((a, b) => b.score - a.score);
    documentCandidates.sort((a, b) => b.score - a.score);

    const best = Math.max(
      imageCandidates[0]?.score ?? 0,
      videoCandidates[0]?.score ?? 0,
      gallerySlug ? 80 : 0
    );

    if (!imageCandidates.length && !videoCandidates.length && !gallerySlug) {
      notes.push("Brak silnych kandydatów — wymaga ręcznej weryfikacji");
    }
    if (imageCandidates.some((c) => c.path.includes("CR2") || c.rel.includes("SUROWE"))) {
      notes.push("Są surowe CR2 — konwersja wymaga JPG lub develop RAW");
    }

    return {
      slug: article.slug,
      title: article.title,
      brand: article.brand,
      model: article.model,
      gallerySlug,
      imageCandidates: imageCandidates.slice(0, 8),
      videoCandidates: videoCandidates.slice(0, 5),
      documentCandidates: documentCandidates.slice(0, 3),
      confidence: confidenceFromScore(best, gallerySlug),
      notes
    };
  });
}

async function main() {
  const priorityOnly = process.argv.includes("--priority");
  const filterSlugs = priorityOnly ? new Set(PRIORITY_SLUGS) : undefined;

  if (!existsSync(MARCIN_ROOT)) {
    console.error("Brak D:\\MARCIN");
    process.exitCode = 1;
    return;
  }

  console.log("Skanowanie D:\\MARCIN (readonly)...");
  const inventory = await scanMarcin();
  const articles = await loadArticles(filterSlugs);
  const galleryConfig = JSON.parse(await fs.readFile(GALLERY_LINKS, "utf8")) as GalleryLinksConfig;
  const photoFolders = await loadPhotoFolders();

  const manifest = await buildPairingManifest(articles, inventory, galleryConfig, photoFolders);

  await fs.mkdir(path.dirname(OUT_INVENTORY), { recursive: true });
  await fs.writeFile(OUT_INVENTORY, JSON.stringify(inventory, null, 2), "utf8");
  await fs.writeFile(OUT_MANIFEST, JSON.stringify(manifest, null, 2), "utf8");

  const high = manifest.filter((m) => m.confidence === "high").length;
  const medium = manifest.filter((m) => m.confidence === "medium").length;
  const low = manifest.filter((m) => m.confidence === "low" || m.confidence === "none").length;

  console.log("\n=== INVENTORY ===");
  console.log(JSON.stringify(inventory.summary, null, 2));
  console.log(`\nManifest: ${manifest.length} artykułów (${high} high, ${medium} medium, ${low} low/none)`);
  console.log(`→ ${path.relative(process.cwd(), OUT_INVENTORY)}`);
  console.log(`→ ${path.relative(process.cwd(), OUT_MANIFEST)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
