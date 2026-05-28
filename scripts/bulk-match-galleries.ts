/**
 * Skanuje D:\MARCIN, dopasowuje foldery ze zdjęciami do artykułów bez galerii,
 * aktualizuje gallery-links.json i galleryDir w MDX.
 * Uruchom: npx tsx scripts/bulk-match-galleries.ts
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const MANIFEST_PATH = path.join(process.cwd(), "src", "data", "galleries-manifest.json");

const SCAN_ROOTS = [
  "D:\\MARCIN\\Galerie z testów",
  "D:\\MARCIN\\Galerie z testów\\SUROWE",
  "D:\\MARCIN\\Foty do obróbki - Marcin",
  "D:\\MARCIN\\TESTY",
  "D:\\MARCIN\\Zdjęcia",
  "D:\\MARCIN\\I DRIVE CARS\\Galerie",
  "D:\\MARCIN\\Fiat 500 Pierwsza Jazda",
  "D:\\MARCIN\\ALFA ROMEO GIULIA NA ŻYWO",
  "D:\\MARCIN\\X6 M50d",
  "D:\\MARCIN\\Dlugi dystans OCTA RS",
  "D:\\MARCIN\\KARTA 23.08.15 backup",
  "D:\\MARCIN\\2017"
];

type GalleryLinksConfig = {
  sourcesRoot: string;
  extraSources?: Record<string, string>;
  skipFolders?: string[];
  galleries: Array<{ sourceFolder: string; outputSlug: string }>;
  articleToGallery: Record<string, string>;
};

type PhotoSource = { fullPath: string; name: string; jpg: number; norm: string; outputSlug: string };

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function toOutputSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function isImage(name: string): boolean {
  const l = name.toLowerCase();
  return (
    l.endsWith(".jpg") ||
    l.endsWith(".jpeg") ||
    l.endsWith(".png") ||
    l.endsWith(".webp")
  );
}

async function countImages(dir: string): Promise<number> {
  let count = 0;
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && isImage(e.name)) count += 1;
    }
  }
  try {
    await walk(dir);
  } catch {
    return 0;
  }
  return count;
}

async function discoverSources(skipNames: Set<string>): Promise<PhotoSource[]> {
  const seen = new Set<string>();
  const sources: PhotoSource[] = [];

  for (const root of SCAN_ROOTS) {
    if (!existsSync(root)) continue;

    async function addDir(full: string, name: string) {
      if (seen.has(full)) return;
      if (skipNames.has(name)) return;
      const jpg = await countImages(full);
      if (jpg < 3) return;
      seen.add(full);
      sources.push({
        fullPath: full,
        name,
        jpg,
        norm: normalize(name),
        outputSlug: toOutputSlug(name)
      });
    }

    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        await addDir(path.join(root, e.name), e.name);
      }
    }
    const rootJpg = await countImages(root);
    const subdirs = entries.filter((e) => e.isDirectory()).length;
    if (rootJpg >= 3 && subdirs === 0) {
      await addDir(root, path.basename(root));
    }
  }

  return sources.sort((a, b) => b.jpg - a.jpg);
}

function tokenize(slug: string, title: string, brand?: string, model?: string): string[] {
  const parts = [
    slug.replace(/-/g, " "),
    title,
    brand ?? "",
    model ?? ""
  ].join(" ");
  return [...new Set(normalize(parts).match(/[a-z0-9]{3,}/g) ?? [])];
}

function scoreMatch(tokens: string[], source: PhotoSource): number {
  const g = source.norm;
  let hits = 0;
  let weight = 0;
  for (const tok of tokens) {
    if (g.includes(tok)) {
      hits += 1;
      weight += tok.length >= 5 ? 3 : 1;
    }
  }
  if (hits === 0) return 0;
  if (source.norm.includes(normalize(tokens[0] ?? ""))) weight += 20;
  return weight;
}

function rewriteMdx(data: Record<string, unknown>, content: string): string {
  const frontmatter = Object.entries(data)
    .map(([k, v]) => {
      if (typeof v === "string" && (v.includes(":") || v.includes('"') || v.includes("\n"))) {
        return `${k}: "${String(v).replace(/"/g, '\\"')}"`;
      }
      if (Array.isArray(v)) return `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join("\n");
  return `---\n${frontmatter}\n---\n\n${content}`;
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as GalleryLinksConfig;
  const skipNames = new Set(config.skipFolders ?? []);
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as Record<
    string,
    unknown[]
  >;

  const existingSlugs = new Set([
    ...config.galleries.map((g) => g.outputSlug),
    ...Object.values(config.extraSources ?? {})
  ]);

  const sources = await discoverSources(skipNames);
  console.log(`Znaleziono ${sources.length} folderów ze zdjęciami (≥3 JPG).\n`);

  let newGalleries = 0;
  let newExtra = 0;

  for (const src of sources) {
    if (existingSlugs.has(src.outputSlug)) continue;

    let slug = src.outputSlug;
    let n = 2;
    while (existingSlugs.has(slug)) {
      slug = `${src.outputSlug}-${n}`;
      n += 1;
    }

    const sourcesRootNorm = path.normalize(config.sourcesRoot);
    const srcNorm = path.normalize(src.fullPath);
    const suroweRoot = path.join(sourcesRootNorm, "SUROWE");
    const folderName = path.basename(src.fullPath);

    if (path.dirname(srcNorm) === sourcesRootNorm || path.dirname(srcNorm) === suroweRoot) {
      config.galleries.push({ sourceFolder: folderName, outputSlug: slug });
      newGalleries += 1;
    } else {
      config.extraSources = config.extraSources ?? {};
      config.extraSources[src.fullPath] = slug;
      newExtra += 1;
    }
    existingSlugs.add(slug);
    console.log(`  + galeria: ${slug} ← ${src.name} (${src.jpg} zdj.)`);
  }

  const files = (await fs.readdir(CONTENT_DIR)).filter(
    (f) => f.endsWith(".mdx") && !/^README\.mdx?$/i.test(f) && f !== "przykladowy-test.mdx"
  );

  const usedGalleries = new Set<string>();
  let linked = 0;
  let mdxUpdated = 0;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const filePath = path.join(CONTENT_DIR, file);
    const raw = (await fs.readFile(filePath, "utf8")).replace(/\0/g, "");
    const { data, content } = matter(raw);

    const currentDir = data.galleryDir as string | undefined;
    const currentSlug = currentDir?.replace(/^galleries[\\/]/, "").replace(/\\/g, "/");
    const hasImages =
      currentSlug && Array.isArray(manifest[currentSlug]) && manifest[currentSlug].length > 0;

    if (hasImages) continue;

    if (config.articleToGallery[slug]) {
      const gSlug = config.articleToGallery[slug];
      if (data.galleryDir !== `galleries/${gSlug}`) {
        data.galleryDir = `galleries/${gSlug}`;
        await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
        mdxUpdated += 1;
      }
      continue;
    }

    const tokens = tokenize(
      slug,
      String(data.title ?? slug),
      data.brand as string | undefined,
      data.model as string | undefined
    );

    let best: PhotoSource | null = null;
    let bestScore = 0;

    for (const src of sources) {
      const s = scoreMatch(tokens, src);
      if (s > bestScore) {
        bestScore = s;
        best = src;
      }
    }

    if (!best || bestScore < 3) continue;

    const gSlug =
      config.galleries.find((g) => g.outputSlug === best!.outputSlug)?.outputSlug ??
      Object.values(config.extraSources ?? {}).find((v) => v === best!.outputSlug) ??
      best.outputSlug;

    config.articleToGallery[slug] = gSlug;
    linked += 1;

    if (data.galleryDir !== `galleries/${gSlug}`) {
      data.galleryDir = `galleries/${gSlug}`;
      await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
      mdxUpdated += 1;
    }

    console.log(`  ↔ ${slug} → ${gSlug} (score ${bestScore}, ${best.name})`);
  }

  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");

  console.log(`\nPodsumowanie:`);
  console.log(`  Nowe galerie w config: ${newGalleries} (+ ${newExtra} extraSources)`);
  console.log(`  Nowe powiązania artykuł→galeria: ${linked}`);
  console.log(`  Zaktualizowane MDX: ${mdxUpdated}`);
  console.log(`\nUruchom: npm run convert:linked`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
