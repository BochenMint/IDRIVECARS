import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_RAW = path.join(process.cwd(), "raw-galleries");
const EXTERNAL_GALLERIES_PRIORITY = [
  "D:\\MARCIN\\Galerie z testów",
  "D:\\MARCIN\\I DRIVE CARS\\Galerie",
  "E:\\MARCIN\\Galerie z testów",
  "E:\\MARCIN\\I DRIVE CARS\\Galerie"
];

function getSourceDir(): string {
  if (process.env.SOURCE_GALLERIES) return process.env.SOURCE_GALLERIES;
  if (process.argv[2]) return path.resolve(process.argv[2]);
  for (const dir of EXTERNAL_GALLERIES_PRIORITY) {
    if (existsSync(dir)) return dir;
  }
  return DEFAULT_RAW;
}

/** Zamienia nazwę folderu na slug (np. "Mercedes-Maybach S 600" → "mercedes-maybach-s-600"). */
function dirNameToSlug(dirName: string): string {
  return dirName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || dirName;
}

const RAW_DIR = getSourceDir();
const OUT_DIR = path.join(process.cwd(), "public", "galleries");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function isImageFile(file: string): boolean {
  const lower = file.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile() && isImageFile(entry.name)) {
      yield fullPath;
    }
  }
}

async function convertOne(srcPath: string, rawDir: string, outDir: string) {
  const rel = path.relative(rawDir, srcPath);
  const parts = rel.split(path.sep).filter(Boolean);
  const fileName = path.basename(srcPath, path.extname(srcPath)) + ".webp";

  const slugDir = parts.length > 1 ? dirNameToSlug(parts[0]) : "misc";
  const rest = parts.length > 1 ? parts.slice(1).join(path.sep).replace(/\.[^.]+$/, "") : "";
  const destPath = path.join(outDir, slugDir, rest ? `${rest}.webp` : fileName);
  const destDir = path.dirname(destPath);

  await ensureDir(destDir);

  await sharp(srcPath)
    .rotate()
    .webp({
      quality: 82,
      effort: 4
    })
    .toFile(destPath);

  // eslint-disable-next-line no-console
  console.log(`Converted ${rel} -> ${path.relative(process.cwd(), destPath)}`);
}

async function main() {
  try {
    await fs.access(RAW_DIR);
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      `Brak katalogu źródeł (${RAW_DIR}). Ustaw SOURCE_GALLERIES lub podaj ścieżkę: npm run convert:galleries -- "E:\\MARCIN\\I DRIVE CARS\\Galerie"`
    );
    return;
  }

  let count = 0;
  for await (const filePath of walk(RAW_DIR)) {
    // eslint-disable-next-line no-await-in-loop
    await convertOne(filePath, RAW_DIR, OUT_DIR);
    count += 1;
  }

  if (count === 0) {
    // eslint-disable-next-line no-console
    console.warn("Nie znaleziono żadnych plików JPG/PNG w raw-galleries.");
  } else {
    // eslint-disable-next-line no-console
    console.log(`Gotowe. Przekonwertowano ${count} plików do WEBP.`);
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});

