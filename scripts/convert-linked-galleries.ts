/**
 * Konwertuje wybrane galerie powiązane z artykułami (gallery-links.json).
 * JPG/PNG → WEBP w public/galleries/{outputSlug}/ (płaska struktura).
 *
 * Uruchom: npm run convert:linked
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

type GalleryLink = {
  articleSlug: string;
  sourceFolder: string | null;
  outputSlug: string;
  note?: string;
};

type GalleryLinksConfig = {
  sourcesRoot: string;
  extraSources?: Record<string, string>;
  links: GalleryLink[];
};

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
    if (entry.isDirectory()) {
      yield* walkImages(fullPath);
    } else if (entry.isFile() && isImageFile(entry.name)) {
      yield fullPath;
    }
  }
}

async function convertFolder(srcDir: string, outputSlug: string): Promise<number> {
  const destDir = path.join(OUT_DIR, outputSlug);
  await fs.mkdir(destDir, { recursive: true });

  let count = 0;
  for await (const srcPath of walkImages(srcDir)) {
    const baseName = path.basename(srcPath, path.extname(srcPath));
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    const destPath = path.join(destDir, `${safeName}.webp`);

    await sharp(srcPath)
      .rotate()
      .webp({ quality: 82, effort: 4 })
      .toFile(destPath);

    count += 1;
  }

  return count;
}

async function main() {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw) as GalleryLinksConfig;

  let total = 0;

  for (const link of config.links) {
    if (!link.sourceFolder) {
      console.warn(`⏭  ${link.outputSlug}: brak folderu źródłowego${link.note ? ` (${link.note})` : ""}`);
      continue;
    }

    const srcDir = path.join(config.sourcesRoot, link.sourceFolder);
    if (!existsSync(srcDir)) {
      console.warn(`⚠  ${link.outputSlug}: nie znaleziono ${srcDir}`);
      continue;
    }

    const count = await convertFolder(srcDir, link.outputSlug);
    console.log(`✓  ${link.outputSlug}: ${count} zdjęć z „${link.sourceFolder}"`);
    total += count;
  }

  if (config.extraSources) {
    for (const [srcDir, outputSlug] of Object.entries(config.extraSources)) {
      if (!existsSync(srcDir)) {
        console.warn(`⚠  ${outputSlug}: nie znaleziono ${srcDir}`);
        continue;
      }
      const count = await convertFolder(srcDir, outputSlug);
      console.log(`✓  ${outputSlug}: ${count} zdjęć (extra)`);
      total += count;
    }
  }

  console.log(`\nGotowe. Łącznie ${total} plików WEBP. Uruchom: npm run generate:galleries-manifest`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
