/**
 * Usuwa galleryDir z artykułów z błędnym proxy (inna marka niż w tytule).
 * Uruchom: npx tsx scripts/fix-wrong-gallery-proxy.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const SLUGS = [
  "citroen-c-elysee-16-hdi-seduction",
  "citroen-c3",
  "honda-civic-16-i-dtec-marzenia-ziemii",
  "honda-cr-v",
  "opel-astra-gtc-20-cdti-sport",
  "opel-zafira-tourer",
  "pierwsza-jazda-c4-cactus",
  "pierwsza-jazda-c4-picasso",
  "pierwsza-jazda-citroen-c1-ciasna-konkurencja"
];

const CONTENT = path.join(process.cwd(), "content", "testy");
const CONFIG = path.join(process.cwd(), "scripts", "gallery-links.json");

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
  const config = JSON.parse(await fs.readFile(CONFIG, "utf8")) as {
    articleToGallery: Record<string, string>;
  };

  for (const slug of SLUGS) {
    delete config.articleToGallery[slug];
    const filePath = path.join(CONTENT, `${slug}.mdx`);
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    if (!data.galleryDir) continue;
    delete data.galleryDir;
    await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
    console.log(`  cleared galleryDir: ${slug}`);
  }

  await fs.writeFile(CONFIG, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`\nUsunięto ${SLUGS.length} błędnych proxy z gallery-links i MDX.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
