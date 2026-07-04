/**
 * Konwersja cache obrazów z content/import/autogaleria/images do WebP (sharp).
 * Uruchom po imporcie: npm run convert:autogaleria-images
 *
 * Plan: oryginały pozostają w images/{slug}/; WebP trafia do images-webp/{slug}/.
 * Docelowo można powiązać z public/galleries/{slug}/hero.webp przy migracji do content/testy.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC_ROOT = path.join(process.cwd(), "content", "import", "autogaleria", "images");
const DST_ROOT = path.join(process.cwd(), "content", "import", "autogaleria", "images-webp");
const MANIFEST_PATH = path.join(process.cwd(), "content", "import", "autogaleria", "webp-manifest.json");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const files = await walk(SRC_ROOT);
  await fs.mkdir(DST_ROOT, { recursive: true });
  const manifest: Array<{ source: string; webp: string; width: number; height: number }> = [];

  for (const src of files) {
    const rel = path.relative(SRC_ROOT, src);
    const dst = path.join(DST_ROOT, rel.replace(/\.[^.]+$/, ".webp"));
    if (existsSync(dst)) continue;
    await fs.mkdir(path.dirname(dst), { recursive: true });
    const img = sharp(src);
    const meta = await img.metadata();
    await img.webp({ quality: 82 }).toFile(dst);
    manifest.push({
      source: path.relative(process.cwd(), src).replace(/\\/g, "/"),
      webp: path.relative(process.cwd(), dst).replace(/\\/g, "/"),
      width: meta.width ?? 0,
      height: meta.height ?? 0
    });
    console.log("webp", rel);
  }

  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), converted: manifest.length, items: manifest }, null, 2),
    "utf8"
  );
  console.log(`Zakończono: ${manifest.length} plików WebP → ${path.relative(process.cwd(), DST_ROOT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
