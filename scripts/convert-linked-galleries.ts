/**
 * Konwertuje wszystkie galerie z gallery-links.json (sekcja galleries + extraSources).
 * Uruchom: npm run convert:linked
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
  let errors = 0;
  for await (const srcPath of walkImages(srcDir)) {
    const baseName = path.basename(srcPath, path.extname(srcPath));
    const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
    const destPath = path.join(destDir, `${safeName}.webp`);

    try {
      await sharp(srcPath)
        .rotate()
        .webp({ quality: 82, effort: 4 })
        .toFile(destPath);
      count += 1;
    } catch {
      errors += 1;
    }
  }

  if (errors > 0) {
    console.warn(`    (${errors} plików pominiętych – uszkodzone)`);
  }

  return count;
}

async function resolveFolderName(sourcesRoot: string, folderName: string): Promise<string | null> {
  const direct = path.join(sourcesRoot, folderName);
  if (existsSync(direct)) return direct;

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

async function main() {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw) as GalleryLinksConfig;

  let total = 0;
  let converted = 0;
  let skipped = 0;

  for (const entry of config.galleries) {
    const srcDir = await resolveFolderName(config.sourcesRoot, entry.sourceFolder);
    if (!srcDir) {
      console.warn(`⚠  ${entry.outputSlug}: brak folderu „${entry.sourceFolder}"`);
      skipped += 1;
      continue;
    }

    const count = await convertFolder(srcDir, entry.outputSlug);
    console.log(`✓  ${entry.outputSlug}: ${count} zdj. ← ${path.basename(srcDir)}`);
    total += count;
    converted += 1;
  }

  if (config.extraSources) {
    for (const [srcDir, outputSlug] of Object.entries(config.extraSources)) {
      if (!existsSync(srcDir)) {
        console.warn(`⚠  ${outputSlug}: brak ${srcDir}`);
        skipped += 1;
        continue;
      }
      const count = await convertFolder(srcDir, outputSlug);
      console.log(`✓  ${outputSlug}: ${count} zdj. (extra)`);
      total += count;
      converted += 1;
    }
  }

  console.log(`\nGotowe: ${converted} galerii, ${total} WEBP, ${skipped} pominiętych.`);
  console.log("Uruchom: npm run generate:galleries-manifest");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
