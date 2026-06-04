/**
 * Sprawdza ile obrazów jest w word/media każdego DOCX (bez zapisu).
 * npx tsx scripts/probe-docx-images.ts
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const MARCIN = "D:\\MARCIN";
const CONTENT = path.join(process.cwd(), "content", "testy");
const TMP = path.join(process.cwd(), ".tmp-import", "_probe");

async function resolveArtykulyTesty(): Promise<string | null> {
  const top = await fs.readdir(MARCIN);
  const arty = top.find((d) => d.toLowerCase().includes("artyku"));
  if (!arty) return null;
  const testy = path.join(MARCIN, arty, "TESTY");
  return existsSync(testy) ? testy : null;
}

async function countMediaInDocx(docxPath: string): Promise<number> {
  await fs.mkdir(TMP, { recursive: true });
  const zipPath = path.join(TMP, "probe.zip");
  const dest = path.join(TMP, "unzipped");
  await fs.copyFile(docxPath, zipPath);
  const { execSync } = await import("node:child_process");
  await fs.rm(dest, { recursive: true, force: true }).catch(() => {});
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force"`,
    { stdio: "pipe" }
  );
  const media = path.join(dest, "word", "media");
  if (!existsSync(media)) return 0;
  const files = await fs.readdir(media);
  return files.filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f)).length;
}

function slugFromBasename(base: string): string {
  return base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getNoDirSlugs(): Promise<Set<string>> {
  const files = await fs.readdir(CONTENT);
  const set = new Set<string>();
  for (const f of files.filter((x) => x.endsWith(".mdx"))) {
    const slug = f.replace(/\.mdx$/, "");
    const { data } = matter(await fs.readFile(path.join(CONTENT, f), "utf8"));
    if (!data.galleryDir) set.add(slug);
  }
  return set;
}

async function main() {
  const noDir = await getNoDirSlugs();
  const roots = [
    await resolveArtykulyTesty(),
    path.join(MARCIN, "Z PULPITU", "DYSK GOOGLE", "MARCIN", "aG", "Testy", "Opublikowane")
  ].filter((r): r is string => !!r && existsSync(r));

  console.log("Roots:", roots.join("\n  "), "\n");

  const hits: Array<{ slug: string; docx: string; images: number }> = [];

  for (const root of roots) {
    const files = await fs.readdir(root);
    for (const name of files.filter((f) => f.toLowerCase().endsWith(".docx"))) {
      const base = name.replace(/\.docx$/i, "");
      const slug = slugFromBasename(base);
      const matchSlug = [...noDir].find(
        (s) => s.includes(slug) || slug.includes(s.replace(/-/g, "")) || s.replace(/-/g, "").includes(slug.replace(/-/g, ""))
      );
      if (!matchSlug) continue;
      const docx = path.join(root, name);
      try {
        const images = await countMediaInDocx(docx);
        if (images > 0) hits.push({ slug: matchSlug, docx, images });
        console.log(`${images} img | ${matchSlug} ← ${name}`);
      } catch (e) {
        console.log(`ERR | ${name}: ${(e as Error).message}`);
      }
    }
  }

  console.log(`\nZ obrazami (≥3 do galerii): ${hits.filter((h) => h.images >= 3).length}`);
  await fs.rm(TMP, { recursive: true, force: true }).catch(() => {});
}

main().catch(console.error);
