/**
 * Skanuje D:\MARCIN w poszukiwaniu folderów ze zdjęciami JPG/PNG.
 * Uruchom: npx tsx scripts/discover-photo-sources.ts
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function isImage(name: string): boolean {
  const l = name.toLowerCase();
  return l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png");
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

async function main() {
  const sources: Array<{ path: string; name: string; jpg: number; norm: string }> = [];

  for (const root of SCAN_ROOTS) {
    if (!existsSync(root)) continue;
    const stat = await fs.stat(root);
    if (stat.isDirectory()) {
      const directJpg = await countImages(root);
      if (directJpg > 0 && !SCAN_ROOTS.some((r) => r !== root && root.startsWith(r + path.sep))) {
        /* only count leaf-ish */
      }
      const entries = await fs.readdir(root, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const full = path.join(root, e.name);
        const jpg = await countImages(full);
        if (jpg > 0) {
          sources.push({ path: full, name: e.name, jpg, norm: normalize(e.name) });
        }
      }
      const rootJpg = await countImages(root);
      const subdirs = entries.filter((e) => e.isDirectory()).length;
      if (rootJpg > 0 && subdirs === 0) {
        sources.push({ path: root, name: path.basename(root), jpg: rootJpg, norm: normalize(path.basename(root)) });
      }
    }
  }

  sources.sort((a, b) => b.jpg - a.jpg);
  console.log(`Znaleziono ${sources.length} folderów ze zdjęciami JPG/PNG:\n`);
  for (const s of sources) {
    console.log(`${String(s.jpg).padStart(4)} | ${s.name}`);
    console.log(`       ${s.path}\n`);
  }
}

main().catch(console.error);
