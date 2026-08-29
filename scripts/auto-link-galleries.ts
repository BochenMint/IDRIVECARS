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
const MANIFEST_PATH = path.join(process.cwd(), "src", "data", "galleries-manifest.json");

const BLOCKED = new Set([
  "test",
  "porsche",
  "wakacje-2014",
  "dcim",
  "2014",
  "2017-03-17",
  "dominik",
  "elszkowski",
  "foty",
  "do-wywo-ania",
  "backup-karty-20102015",
  "zdjecia",
  "zdjecia-z-gopro",
  "backstage"
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function brandKey(brand?: string): string {
  if (!brand) return "";
  const b = normalize(brand);
  if (b.startsWith("mercedes")) return "mercedes";
  if (b.startsWith("volkswagen") || b === "vw") return "volkswagen";
  if (b.startsWith("alfa")) return "alfa";
  return b.slice(0, 6);
}

function scoreMatch(
  articleSlug: string,
  title: string,
  gallerySlug: string,
  brand?: string
): number {
  if (BLOCKED.has(gallerySlug)) return 0;

  const a = normalize(articleSlug);
  const t = normalize(title);
  const g = normalize(gallerySlug);
  const bk = brandKey(brand);

  if (bk && !g.includes(bk.slice(0, 4))) return 0;

  if (a === g || g.includes(a) || a.includes(g)) return 100;

  const tokens = [...new Set([...a.split(/-/), ...t.split(/\s+/)].filter((x) => x.length > 3))];
  let hits = 0;
  for (const tok of tokens) {
    if (g.includes(tok)) hits += 1;
  }
  return hits >= 3 ? hits * 10 : 0;
}

async function main() {
  if (!existsSync(GALLERIES_DIR)) {
    console.log("Brak public/galleries – uruchom najpierw convert:linked");
    return;
  }

  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as Record<
    string,
    unknown[]
  >;
  const gallerySlugs = (await fs.readdir(GALLERIES_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((s) => !BLOCKED.has(s) && (manifest[s]?.length ?? 0) > 0);

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
      const s = scoreMatch(slug, title, gSlug, data.brand as string | undefined);
      if (s > bestScore) {
        bestScore = s;
        bestSlug = gSlug;
      }
    }

    if (bestScore < 30 || !bestSlug) continue;

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
