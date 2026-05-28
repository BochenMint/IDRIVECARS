/**
 * Import artykułów z aG/Testy i Artykuły\TESTY z automatycznym powiązaniem galerii.
 * Uruchom: npm run import:ag
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const TEXT_EXT = [".docx", ".doc", ".rtf"];

type Config = {
  articleToGallery: Record<string, string>;
  docxSources: string[];
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^~.*$/, "");
}

function escapeYamlString(s: string): string {
  const cleaned = s.replace(/\r\n/g, "\n").trim();
  if (cleaned.includes("\n") || cleaned.includes('"') || cleaned.includes(":")) {
    return `"${cleaned.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return `"${cleaned}"`;
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readDocx(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".rtf") {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .replace(/\0/g, "")
      .replace(/\\[a-z]+\d* ?/gi, " ")
      .replace(/[{}]/g, "")
      .trim();
  }
  const buf = await fs.readFile(filePath);
  const result = await mammoth.convertToHtml({ buffer: buf });
  return htmlToMarkdown(result.value).replace(/\0/g, "");
}

async function* walkDocx(dir: string): AsyncGenerator<string> {
  if (!existsSync(dir)) return;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDocx(full);
    } else if (entry.isFile() && TEXT_EXT.includes(path.extname(entry.name).toLowerCase())) {
      if (entry.name.startsWith("~$")) continue;
      yield full;
    }
  }
}

function parseTitleFromFilename(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .replace(/\s*-\s*GOTOWY!?\.?/i, "")
    .replace(/\s*\(\d+\)/, "")
    .trim();
}

function guessBrand(title: string): string {
  const brands = [
    "Mercedes-Maybach", "Mercedes-AMG", "Mercedes", "Volkswagen", "BMW", "Audi",
    "Lexus", "Ford", "Mazda", "Volvo", "Skoda", "Peugeot", "Citroen", "Nissan",
    "Toyota", "Hyundai", "Land Rover", "Porsche", "Fiat", "Seat", "Bentley",
    "Renault", "Jeep", "Rolls-Royce", "Alfa Romeo", "Opel", "Smart"
  ];
  for (const b of brands) {
    if (title.toLowerCase().startsWith(b.toLowerCase())) return b;
  }
  return title.split(/\s+/)[0] ?? "Auto";
}

function resolveGallerySlug(slug: string, map: Record<string, string>): string | null {
  if (map[slug]) return map[slug];
  for (const [key, val] of Object.entries(map)) {
    if (slug.includes(key) || key.includes(slug)) return val;
  }
  return null;
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as Config;
  await fs.mkdir(CONTENT_DIR, { recursive: true });

  const existing = new Set(
    (await fs.readdir(CONTENT_DIR))
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""))
  );

  let written = 0;
  let withGallery = 0;
  let skipped = 0;

  for (const sourceRoot of config.docxSources) {
    for await (const filePath of walkDocx(sourceRoot)) {
      const slug = toSlug(parseTitleFromFilename(filePath));
      if (!slug || slug.length < 3) continue;

      if (existing.has(slug)) {
        skipped += 1;
        continue;
      }

      let body: string;
      try {
        body = await readDocx(filePath);
      } catch {
        console.warn(`  ⚠ Nie można odczytać: ${filePath}`);
        continue;
      }

      if (body.length < 100) continue;

      const title = parseTitleFromFilename(filePath);
      const brand = guessBrand(title);
      const model = title.replace(new RegExp(`^${brand}\\s*`, "i"), "").trim() || title;
      const lead = body.slice(0, 280).replace(/\0/g, "").replace(/\s+/g, " ").trim();
      const gallerySlug = resolveGallerySlug(slug, config.articleToGallery);
      const isFirstDrive = /pierwsza\s+jazda/i.test(title);

      const lines = [
        `slug: ${escapeYamlString(slug)}`,
        `title: ${escapeYamlString(title)}`,
        `brand: ${escapeYamlString(brand)}`,
        `model: ${escapeYamlString(model)}`,
        `publishedAt: "2015-06-01"`,
        `lead: ${escapeYamlString(lead)}`,
        `originalUrl: ""`,
        `tags: [${isFirstDrive ? '"pierwsza-jazda"' : '"test"'}]`
      ];

      if (gallerySlug) {
        lines.push(`galleryDir: "galleries/${gallerySlug}"`);
        withGallery += 1;
      }

      const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`);
      await fs.writeFile(mdxPath, `---\n${lines.join("\n")}\n---\n\n${body}`, "utf8");
      existing.add(slug);
      written += 1;
      console.log(`  + ${slug}${gallerySlug ? ` → ${gallerySlug}` : ""}`);
    }
  }

  console.log(`\nImport: ${written} nowych artykułów (${withGallery} z galerią), ${skipped} pominiętych (już istnieją).`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
