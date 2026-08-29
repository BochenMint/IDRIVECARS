/**
 * Przypisuje galleryDir tylko z jawnego mapowania articleToGallery w gallery-links.json.
 * Brak fuzzy proxy — lepiej brak zdjęć niż zła marka.
 * Uruchom: npx tsx scripts/assign-missing-galleries.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const MANIFEST_PATH = path.join(process.cwd(), "src", "data", "galleries-manifest.json");

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

  const files = (await fs.readdir(CONTENT_DIR)).filter(
    (f) => f.endsWith(".mdx") && !/^README\.mdx?$/i.test(f) && f !== "przykladowy-test.mdx"
  );

  let assigned = 0;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const filePath = path.join(CONTENT_DIR, file);
    const raw = (await fs.readFile(filePath, "utf8")).replace(/\0/g, "");
    const { data, content } = matter(raw);

    const currentSlug = (data.galleryDir as string | undefined)
      ?.replace(/^galleries[\\/]/, "")
      .replace(/\\/g, "/");
    if (currentSlug && available.has(currentSlug)) continue;

    const gallery = config.articleToGallery[slug] ?? null;
    if (!gallery || !available.has(gallery)) continue;

    data.galleryDir = `galleries/${gallery}`;
    await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
    assigned += 1;
    console.log(`  ✓ ${slug} → ${gallery}`);
  }

  console.log(`\nPrzypisano galerie do ${assigned} artykułów (tylko jawne mapowania).`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
