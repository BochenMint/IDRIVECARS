/**
 * Kuracja galerii: zostawia 20–30 najlepszych zdjęć na podstawie:
 * - ostrości (wariancja Laplace'a)
 * - ekspozycji (unika przepaleń i niedoświetleń)
 * - rozdzielczości
 * - różnorodności (dHash – odrzuca prawie identyczne ujęcia)
 *
 * Usuwa TYLKO kopie WEBP z public/galleries — oryginały na D:\MARCIN nietknięte.
 *
 * Uruchom: npm run curate:galleries
 * Podgląd: npm run curate:galleries -- --dry-run
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const GALLERIES_DIR = path.join(process.cwd(), "public", "galleries");
const TARGET = Number(process.env.CURATE_TARGET ?? 25);
const MIN_KEEP = Number(process.env.CURATE_MIN ?? 20);
const MAX_KEEP = Number(process.env.CURATE_MAX ?? 30);
const CURATE_ABOVE = Number(process.env.CURATE_ABOVE ?? 30);
const DRY_RUN = process.argv.includes("--dry-run");

type ScoredImage = {
  absPath: string;
  relPath: string;
  score: number;
  hash: string;
};

async function collectWebpFiles(dir: string, baseRel: string): Promise<Array<{ abs: string; rel: string }>> {
  const result: Array<{ abs: string; rel: string }> = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = baseRel ? `${baseRel}/${e.name}` : e.name;
    if (e.isFile() && e.name.toLowerCase().endsWith(".webp")) {
      result.push({ abs: full, rel });
    } else if (e.isDirectory()) {
      result.push(...(await collectWebpFiles(full, rel)));
    }
  }
  return result;
}

async function computeDHash(filePath: string): Promise<string> {
  const { data, info } = await sharp(filePath)
    .greyscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  let hash = "";
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = data[y * w + x];
      const right = data[y * w + x + 1];
      hash += left > right ? "1" : "0";
    }
  }
  return hash;
}

function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) d += 1;
  }
  return d;
}

async function scoreImage(filePath: string): Promise<{ score: number; hash: string }> {
  const meta = await sharp(filePath).metadata();
  const stats = await sharp(filePath).stats();

  const { data, info } = await sharp(filePath)
    .greyscale()
    .resize(640, 480, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  let lapSum = 0;
  let lapSumSq = 0;
  let count = 0;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = -4 * data[i] + data[i - 1] + data[i + 1] + data[i - w] + data[i + w];
      lapSum += lap;
      lapSumSq += lap * lap;
      count += 1;
    }
  }

  const lapMean = lapSum / count;
  const sharpness = lapSumSq / count - lapMean * lapMean;

  const mean = stats.channels.reduce((s, c) => s + c.mean, 0) / stats.channels.length;
  const stdev = stats.channels.reduce((s, c) => s + c.stdev, 0) / stats.channels.length;

  let exposure = 1;
  if (mean < 25 || mean > 235) exposure = 0.3;
  else if (mean < 45 || mean > 210) exposure = 0.65;

  if (stdev < 12) exposure *= 0.5;

  const entropy = stats.entropy ?? 0;
  const pixels = (meta.width ?? 0) * (meta.height ?? 0);
  const resolution = Math.min(1, pixels / (1600 * 1200));

  const score =
    Math.log1p(sharpness) * 35 * exposure +
    entropy * 12 * exposure +
    resolution * 25 +
    stdev * 0.15;

  const hash = await computeDHash(filePath);
  return { score, hash };
}

async function safeUnlink(filePath: string): Promise<boolean> {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "EBUSY" || code === "EPERM") {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      if (code === "ENOENT") return true;
      throw err;
    }
  }

  const pending = `${filePath}.deleteme`;
  try {
    await fs.rename(filePath, pending);
    await fs.unlink(pending);
    return true;
  } catch {
    return false;
  }
}

function selectDiverse(scored: ScoredImage[], target: number): ScoredImage[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const selected: ScoredImage[] = [];
  const SIMILARITY_THRESHOLD = 7;

  for (const candidate of sorted) {
    if (selected.length >= target) break;

    const tooSimilar = selected.some(
      (s) => hamming(s.hash, candidate.hash) < SIMILARITY_THRESHOLD
    );

    if (tooSimilar && selected.length >= MIN_KEEP) continue;
    selected.push(candidate);
  }

  for (const candidate of sorted) {
    if (selected.length >= target) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected.slice(0, MAX_KEEP);
}

async function curateGallery(slug: string): Promise<{ before: number; after: number; removed: number }> {
  const galleryDir = path.join(GALLERIES_DIR, slug);
  const files = await collectWebpFiles(galleryDir, slug);

  if (files.length <= CURATE_ABOVE) {
    return { before: files.length, after: files.length, removed: 0 };
  }

  const target = Math.min(MAX_KEEP, Math.max(MIN_KEEP, TARGET));
  const scored: ScoredImage[] = [];

  for (const f of files) {
    try {
      const { score, hash } = await scoreImage(f.abs);
      scored.push({ absPath: f.abs, relPath: f.rel, score, hash });
    } catch {
      /* pomijamy uszkodzone */
    }
  }

  const keep = selectDiverse(scored, target);
  const keepSet = new Set(keep.map((k) => k.absPath));
  let removed = 0;
  let failed = 0;

  for (const f of files) {
    if (!keepSet.has(f.abs)) {
      if (DRY_RUN) {
        removed += 1;
      } else {
        const ok = await safeUnlink(f.abs);
        if (ok) removed += 1;
        else failed += 1;
      }
    }
  }

  if (failed > 0) {
    console.warn(`    ⚠ ${failed} plików zablokowanych (Windows) – uruchom curate:galleries ponownie`);
  }

  return { before: files.length, after: keep.length, removed };
}

async function main() {
  if (!existsSync(GALLERIES_DIR)) {
    console.log("Brak public/galleries");
    return;
  }

  const dirs = (await fs.readdir(GALLERIES_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();

  console.log(
    DRY_RUN
      ? `🔍 Podgląd kuracji (cel: ${MIN_KEEP}–${MAX_KEEP}, domyślnie ${TARGET})\n`
      : `✂️  Kuracja galerii (cel: ${MIN_KEEP}–${MAX_KEEP}, domyślnie ${TARGET})\n`
  );

  let totalBefore = 0;
  let totalAfter = 0;
  let totalRemoved = 0;
  let curated = 0;

  for (const slug of dirs) {
    const result = await curateGallery(slug);
    totalBefore += result.before;
    totalAfter += result.after;
    totalRemoved += result.removed;

    if (result.removed > 0) {
      curated += 1;
      console.log(
        `  ${slug}: ${result.before} → ${result.after} (${result.removed} usuniętych)`
      );
    }
  }

  console.log(
    `\n${DRY_RUN ? "Podgląd" : "Gotowe"}: ${curated} galerii skurated, ${totalBefore} → ${totalAfter} zdjęć (−${totalRemoved})`
  );

  if (!DRY_RUN && totalRemoved > 0) {
    console.log("Uruchom: npm run generate:galleries-manifest");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
