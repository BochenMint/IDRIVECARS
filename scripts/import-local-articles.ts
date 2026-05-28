/**
 * Import artykułów z D:\MARCIN\Artykuły i powiązanie z galeriami z D:\MARCIN\Galerie z testów.
 * Zapisuje pliki content/testy/<slug>.mdx i przygotowuje galerie do konwersji.
 *
 * Uruchom: npx tsx scripts/import-local-articles.ts
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import mammoth from "mammoth";

const ARTICLES_ROOT = "D:\\MARCIN\\Artykuły";
const GALLERIES_ROOT = "D:\\MARCIN\\Galerie z testów";
const ARTICLES_AG_ROOT = "D:\\MARCIN\\Z PULPITU\\DYSK GOOGLE\\MARCIN\\aG\\Testy";
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");

const TEXT_EXT = [".txt", ".md", ".html", ".htm", ".docx", ".doc"];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || name;
}

function escapeYamlString(s: string): string {
  const cleaned = s.replace(/\r\n/g, "\n").trim();
  if (cleaned.includes("\n") || cleaned.includes('"') || cleaned.includes(":")) {
    return `"${cleaned.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return `"${cleaned}"`;
}

async function listSubdirs(dir: string): Promise<{ name: string; slug: string }[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, slug: toSlug(e.name) }));
}

async function findFirstTextFile(dir: string): Promise<string | null> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && TEXT_EXT.includes(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name))
    .sort();
  return files[0] ?? null;
}

async function readTextFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".docx" || ext === ".doc") {
    const buf = await fs.readFile(filePath);
    const result = await mammoth.convertToHtml({ buffer: buf });
    return htmlToMarkdown(result.value);
  }
  const raw = await fs.readFile(filePath, "utf8");
  if (ext === ".html" || ext === ".htm") {
    return htmlToMarkdown(raw);
  }
  return raw;
}

function htmlToMarkdown(html: string): string {
  let out = html
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
    .replace(/<i>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}

async function main(): Promise<void> {
  console.log("Źródła:");
  console.log("  Artykuły:", ARTICLES_ROOT);
  console.log("  Galerie:", GALLERIES_ROOT);

  const articleDirs = await listSubdirs(ARTICLES_ROOT);
  const galleryDirs = await listSubdirs(GALLERIES_ROOT);

  const galleryBySlug = new Map<string, string>();
  for (const g of galleryDirs) {
    galleryBySlug.set(g.slug, g.name);
  }

  console.log("\nArtykuły:", articleDirs.length);
  console.log("Galerie:", galleryDirs.length);

  await fs.mkdir(CONTENT_DIR, { recursive: true });

  let written = 0;

  for (const art of articleDirs) {
    const articlePath = path.join(ARTICLES_ROOT, art.name);
    const textFile = await findFirstTextFile(articlePath);
    if (!textFile) {
      console.warn("  Brak pliku .txt/.md/.html/.docx w:", art.name);
      continue;
    }

    const slug = art.slug;
    const galleryFolderName = galleryBySlug.get(slug);
    const hasGallery = Boolean(galleryFolderName);

    let body: string;
    try {
      body = await readTextFile(textFile);
    } catch (err) {
      console.warn("  Nie można odczytać:", textFile, err);
      continue;
    }

    const lead = body.slice(0, 250).replace(/\n/g, " ").trim();
    const title = art.name;
    const brand = title.split(/\s+/)[0] ?? "Marka";
    const model = title.replace(brand, "").trim().slice(0, 80) || "Model";

    const frontmatter = [
      `slug: ${escapeYamlString(slug)}`,
      `title: ${escapeYamlString(title)}`,
      `brand: ${escapeYamlString(brand)}`,
      `model: ${escapeYamlString(model)}`,
      `publishedAt: "2015-01-01"`,
      `lead: ${escapeYamlString(lead)}`,
      `originalUrl: ""`,
      `heroImage: "galleries/${slug}/hero.webp"`,
      `galleryDir: "galleries/${slug}"`
    ].join("\n");

    const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`);
    await fs.writeFile(mdxPath, `---\n${frontmatter}\n---\n\n${body}`, "utf8");
    written++;
    console.log("  Zapisano:", slug, hasGallery ? "(galeria: " + galleryFolderName + ")" : "");
  }

  console.log("\nGotowe. Zapisano artykułów:", written);
  console.log("Galerie: uruchom npm run convert:galleries (źródło: E:\\MARCIN\\Galerie z testów).");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
