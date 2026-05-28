/**
 * Automatycznie dopasowuje galleryDir do artykułów bez galerii
 * na podstawie podobieństwa slug ↔ folder galerii.
 * Uruchom: npm run link:galleries:auto
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const GALLERIES_DIR = path.join(process.cwd(), "public", "galleries");

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function scoreMatch(articleSlug: string, title: string, gallerySlug: string): number {
  const a = normalize(articleSlug);
  const t = normalize(title);
  const g = normalize(gallerySlug);

  if (a === g || g.includes(a) || a.includes(g)) return 100;

  const tokens = [...new Set([...a.split("-"), ...t.split(" ")].filter((x) => x.length > 2))];
  let hits = 0;
  for (const tok of tokens) {
    if (g.includes(tok)) hits += 1;
  }
  return hits >= 2 ? hits * 10 : 0;
}

async function main() {
  if (!existsSync(GALLERIES_DIR)) {
    console.log("Brak public/galleries – uruchom najpierw convert:linked");
    return;
  }

  const gallerySlugs = (await fs.readdir(GALLERIES_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const files = (await fs.readdir(CONTENT_DIR)).filter(
    (f) => f.endsWith(".mdx") && f !== "README.md"
  );

  let linked = 0;

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = (await fs.readFile(filePath, "utf8")).replace(/\0/g, "");
    const { data, content } = matter(raw);

    if (data.galleryDir) continue;

    const slug = file.replace(/\.mdx$/, "");
    const title = String(data.title ?? slug);

    let bestSlug = "";
    let bestScore = 0;

    for (const gSlug of gallerySlugs) {
      const s = scoreMatch(slug, title, gSlug);
      if (s > bestScore) {
        bestScore = s;
        bestSlug = gSlug;
      }
    }

    if (bestScore < 15 || !bestSlug) continue;

    data.galleryDir = `galleries/${bestSlug}`;
    const frontmatter = Object.entries(data)
      .map(([k, v]) => {
        if (typeof v === "string") return `${k}: ${JSON.stringify(v)}`;
        if (Array.isArray(v)) return `${k}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`;
        return `${k}: ${JSON.stringify(v)}`;
      })
      .join("\n");

    await fs.writeFile(filePath, `---\n${frontmatter}\n---\n\n${content}`, "utf8");
    linked += 1;
    console.log(`  ~ ${slug} → ${bestSlug} (score ${bestScore})`);
  }

  console.log(`\nAuto-dopasowano galerie do ${linked} artykułów.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
