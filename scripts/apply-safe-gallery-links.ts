/**
 * Czyści błędne galleryDir (junk), utrwala jawne mapowania w MDX.
 * npx tsx scripts/apply-safe-gallery-links.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT = path.join(process.cwd(), "content", "testy");
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
  "film-skoda-octavia-rs-d-ugi-dystans",
  "backstage"
]);

/** Tylko mapowania tej samej marki + jedyna dostępna galeria marki lub dopasowanie nazwy. */
const EXPLICIT: Record<string, string> = {
  "alfa-romeo-giulietta-nie-tylko-dla-wtajemniczonych": "alfa-romeo-giulia-na-zywo",
  "alfa-romeo-giulietta-quadrifoglio-verde-1750-tbi": "alfa-romeo-giulia-na-zywo",
  "volkswagen-california": "volkswagen-california-pierwsza-jazda"
};

function rewriteMdx(data: Record<string, unknown>, content: string): string {
  const frontmatter = Object.entries(data)
    .map(([k, v]) => {
      if (typeof v === "string" && (v.includes(":") || v.includes('"') || v.includes("\n"))) {
        return `${k}: "${String(v).replace(/"/g, '\\"')}"`;
      }
      if (Array.isArray(v)) return `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join("\n");
  return `---\n${frontmatter}\n---\n\n${content}`;
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as {
    articleToGallery: Record<string, string>;
  };
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as Record<
    string,
    unknown[]
  >;
  const available = new Set(
    Object.keys(manifest).filter((k) => Array.isArray(manifest[k]) && manifest[k].length > 0)
  );

  const files = (await fs.readdir(CONTENT)).filter(
    (f) => f.endsWith(".mdx") && f !== "README.md" && f !== "przykladowy-test.mdx"
  );

  let cleared = 0;
  let assigned = 0;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const filePath = path.join(CONTENT, file);
    const raw = (await fs.readFile(filePath, "utf8")).replace(/\0/g, "");
    const { data, content } = matter(raw);
    let dirty = false;
    const currentSlug = (data.galleryDir as string | undefined)?.replace(/^galleries[\\/]/, "");

    if (currentSlug && BLOCKED.has(currentSlug)) {
      delete data.galleryDir;
      cleared += 1;
      dirty = true;
    }

    const target = EXPLICIT[slug] ?? null;
    if (target && available.has(target) && !BLOCKED.has(target)) {
      config.articleToGallery[slug] = target;
      if (data.galleryDir !== `galleries/${target}`) {
        data.galleryDir = `galleries/${target}`;
        assigned += 1;
        dirty = true;
        console.log(`  ✓ ${slug} → ${target}`);
      }
    }

    if (dirty) await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
  }

  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`\nWyczyszczono ${cleared} junk, przypisano ${assigned}.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
