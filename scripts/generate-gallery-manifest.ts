/**
 * Skanuje public/galleries i zapisuje listę zdjęć do src/data/galleries-manifest.json.
 * Uruchamiane przed buildem (prebuild) lub ręcznie: npx tsx scripts/generate-gallery-manifest.ts
 * Wymaga wcześniejszego: npm run convert:galleries
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const GALLERIES_DIR = path.join(process.cwd(), "public", "galleries");
const OUT_FILE = path.join(process.cwd(), "src", "data", "galleries-manifest.json");

type Manifest = Record<string, Array<{ src: string; alt: string }>>;

async function collectWebp(dir: string, baseRel: string): Promise<Array<{ src: string; alt: string }>> {
  const result: Array<{ src: string; alt: string }> = [];
  let entries: { name: string; isFile: () => boolean }[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const e of entries) {
    const fullPath = path.join(dir, e.name);
    const rel = baseRel ? `${baseRel}/${e.name}` : e.name;
    if (e.isFile() && e.name.toLowerCase().endsWith(".webp")) {
      const src = `/galleries/${rel}`.replace(/\\/g, "/");
      result.push({ src, alt: `${baseRel} – ${e.name}` });
    } else if (e.isDirectory()) {
      result.push(...(await collectWebp(fullPath, rel)));
    }
  }
  return result;
}

async function main() {
  if (!existsSync(GALLERIES_DIR)) {
    await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
    await fs.writeFile(OUT_FILE, JSON.stringify({}, null, 0), "utf8");
    console.log("Brak public/galleries – zapisano pusty manifest.");
    return;
  }

  const topDirs = await fs.readdir(GALLERIES_DIR, { withFileTypes: true });
  const manifest: Manifest = {};

  for (const entry of topDirs) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const slug = entry.name;
    const absDir = path.join(GALLERIES_DIR, entry.name);
    const images = await collectWebp(absDir, slug);
    images.sort((a, b) => a.src.localeCompare(b.src, "pl"));
    if (images.length) manifest[slug] = images;
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(manifest, null, 0), "utf8");
  const total = Object.values(manifest).reduce((s, arr) => s + arr.length, 0);
  console.log(`Manifest: ${Object.keys(manifest).length} galerii, ${total} zdjęć → ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
