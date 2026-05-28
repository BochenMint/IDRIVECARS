/**
 * Pobiera newsy z kanałów RSS zdefiniowanych w content/news-sources.json
 * i zapisuje je jako pliki MDX w content/news/.
 * Uruchom: npm run fetch:news  (lub npx tsx scripts/fetch-news-rss.ts)
 *
 * Wymaga: npm i rss-parser (opcjonalnie – bez niego skrypt zakończy się komunikatem).
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SOURCES_PATH = path.join(process.cwd(), "content", "news-sources.json");
const NEWS_DIR = path.join(process.cwd(), "content", "news");

type SourceConfig = {
  name: string;
  url: string;
  enabled?: boolean;
  maxItemsPerRun?: number;
};

function toSlug(title: string, dateStr: string): string {
  const date = dateStr.slice(0, 10).replace(/-/g, "");
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${date}-${base}`.slice(0, 80);
}

function escapeYaml(s: string): string {
  if (s.includes("\n") || s.includes('"') || s.includes(":"))
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `"${s}"`;
}

async function fetchRssWithParser(url: string, sourceName: string) {
  try {
    const Parser = (await import("rss-parser")).default;
    const parser = new Parser();
    const feed = await parser.parseURL(url);
    return (feed.items || []).map((item) => ({
      title: item.title ?? "",
      link: item.link ?? item.guid ?? "",
      content: item.contentSnippet ?? item.content ?? "",
      pubDate: item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 19) + "Z" : new Date().toISOString(),
      sourceName
    }));
  } catch (e) {
    console.warn("rss-parser nie jest zainstalowany lub błąd parsowania:", e);
    return [];
  }
}

async function main() {
  if (!existsSync(SOURCES_PATH)) {
    console.warn("Brak pliku content/news-sources.json. Utwórz go według opisu w docs/PLAN-REKLAMY-I-NEWS.md");
    return;
  }

  const raw = await fs.readFile(SOURCES_PATH, "utf8");
  const sources: SourceConfig[] = JSON.parse(raw);
  const enabled = sources.filter((s) => s.enabled !== false);

  await fs.mkdir(NEWS_DIR, { recursive: true });

  let written = 0;
  for (const src of enabled) {
    const items = await fetchRssWithParser(src.url, src.name);
    const max = src.maxItemsPerRun ?? 10;
    for (const item of items.slice(0, max)) {
      if (!item.title || !item.link) continue;
      const slug = toSlug(item.title, item.pubDate.slice(0, 10));
      const lead = item.content.slice(0, 300).replace(/\n/g, " ").trim();
      const mdxPath = path.join(NEWS_DIR, `${slug}.mdx`);
      try {
        await fs.access(mdxPath);
        continue;
      } catch {
        // plik nie istnieje – zapisujemy
      }
      const frontmatter = [
        `title: ${escapeYaml(item.title)}`,
        `lead: ${escapeYaml(lead)}`,
        `sourceUrl: ${escapeYaml(item.link)}`,
        `sourceName: ${escapeYaml(item.sourceName)}`,
        `publishedAt: "${item.pubDate}"`,
        `status: "published"`
      ].join("\n");
      await fs.writeFile(mdxPath, `---\n${frontmatter}\n---\n\n`, "utf8");
      written++;
      console.log("Zapisano:", slug);
    }
  }

  console.log("Gotowe. Zapisano newsów:", written);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
