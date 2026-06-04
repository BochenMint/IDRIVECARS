/**
 * Konwertuje tylko galerie z gallery-links, których jeszcze nie ma w public/galleries (≥1 plik).
 * npx tsx scripts/convert-new-galleries-only.ts
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type GalleryEntry = { sourceFolder: string; outputSlug: string };
type GalleryLinksConfig = {
  sourcesRoot: string;
  extraSources?: Record<string, string>;
  galleries: GalleryEntry[];
};

const SKIP_EXTRA = new Set([
  "D:\\MARCIN\\Zdjęcia\\WAKACJE 2014",
  "D:\\MARCIN\\KARTA 23.08.15 backup\\DCIM",
  "D:\\MARCIN\\TESTY\\TEST",
  "D:\\MARCIN\\Zdjęcia\\2014",
  "D:\\MARCIN\\2017\\2017-03-17",
  "D:\\MARCIN\\Zdjęcia\\PORSCHE",
  "D:\\MARCIN\\TESTY\\Elszkowski",
  "D:\\MARCIN\\TESTY\\Dominik",
  "D:\\MARCIN\\Zdjęcia\\do wywołania",
  "D:\\MARCIN\\Zdjęcia\\FOTY"
]);

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const OUT_DIR = path.join(process.cwd(), "public", "galleries");

function isImageFile(file: string): boolean {
  const lower = file.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}

async function* walkImages(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walkImages(fullPath);
    else if (entry.isFile() && isImageFile(entry.name)) yield fullPath;
  }
}

async function hasWebp(slug: string): Promise<boolean> {
  const dir = path.join(OUT_DIR, slug);
  if (!existsSync(dir)) return false;
  const files = await fs.readdir(dir);
  return files.some((f) => f.endsWith(".webp"));
}

async function convertFolder(srcDir: string, outputSlug: string): Promise<number> {
  const destDir = path.join(OUT_DIR, outputSlug);
  await fs.mkdir(destDir, { recursive: true });
  let count = 0;
  for await (const srcPath of walkImages(srcDir)) {
    const baseName = path.basename(srcPath, path.extname(srcPath));
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    const destPath = path.join(destDir, `${safeName}.webp`);
    try {
      await sharp(srcPath).rotate().webp({ quality: 82, effort: 4 }).toFile(destPath);
      count += 1;
    } catch {
      /* skip */
    }
  }
  return count;
}

async function resolveFolderName(sourcesRoot: string, folderName: string): Promise<string | null> {
  const direct = path.join(sourcesRoot, folderName);
  if (existsSync(direct)) return direct;
  const surowe = path.join(sourcesRoot, "SUROWE", folderName);
  if (existsSync(surowe)) return surowe;
  return null;
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as GalleryLinksConfig;
  let converted = 0;

  for (const entry of config.galleries) {
    if (await hasWebp(entry.outputSlug)) continue;
    const srcDir = await resolveFolderName(config.sourcesRoot, entry.sourceFolder);
    if (!srcDir) {
      console.warn(`⚠ brak źródła: ${entry.sourceFolder}`);
      continue;
    }
    const n = await convertFolder(srcDir, entry.outputSlug);
    console.log(`✓ ${entry.outputSlug}: ${n} zdj.`);
    converted += 1;
  }

  if (config.extraSources) {
    for (const [srcDir, outputSlug] of Object.entries(config.extraSources)) {
      if (SKIP_EXTRA.has(srcDir)) {
        console.log(`⊘ pominięto junk: ${outputSlug}`);
        continue;
      }
      if (await hasWebp(outputSlug)) continue;
      if (!existsSync(srcDir)) continue;
      const n = await convertFolder(srcDir, outputSlug);
      console.log(`✓ ${outputSlug}: ${n} zdj. (extra)`);
      converted += 1;
    }
  }

  console.log(`\nSkonwertowano ${converted} nowych galerii.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
