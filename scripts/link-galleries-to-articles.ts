/**
 * Aktualizuje galleryDir w istniejących MDX na podstawie articleToGallery z gallery-links.json.
 * Uruchom: npm run link:galleries
 */

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as {
    articleToGallery: Record<string, string>;
  };

  const files = (await fs.readdir(CONTENT_DIR)).filter((f) => f.endsWith(".mdx") && f !== "README.md");
  let updated = 0;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const gallerySlug = config.articleToGallery[slug];
    if (!gallerySlug) continue;

    const filePath = path.join(CONTENT_DIR, file);
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw.replace(/\0/g, ""));

    const newGalleryDir = `galleries/${gallerySlug}`;
    if (data.galleryDir === newGalleryDir) continue;

    data.galleryDir = newGalleryDir;
    const frontmatter = Object.entries(data)
      .map(([k, v]) => {
        if (typeof v === "string" && (v.includes(":") || v.includes('"') || v.includes("\n"))) {
          return `${k}: "${String(v).replace(/"/g, '\\"')}"`;
        }
        if (Array.isArray(v)) return `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`;
        return `${k}: ${JSON.stringify(v)}`;
      })
      .join("\n");

    await fs.writeFile(filePath, `---\n${frontmatter}\n---\n\n${content}`, "utf8");
    updated += 1;
    console.log(`  ↻ ${slug} → ${newGalleryDir}`);
  }

  console.log(`\nZaktualizowano galleryDir w ${updated} artykułach.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
