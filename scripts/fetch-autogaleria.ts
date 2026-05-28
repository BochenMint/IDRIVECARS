/**
 * Pobiera listę artykułów Marcina Bochenka z autogaleria.pl i zapisuje je jako pliki MDX.
 * Uruchom: npx tsx scripts/fetch-autogaleria.ts
 *
 * Ograniczenia: pobierana jest tylko pierwsza strona listy autora (ok. 20 artykułów).
 * Strona "Pokaż więcej" może wymagać JavaScriptu – w razie potrzeby uruchom skrypt ponownie
 * z innym zakresem stron (np. ?paged=2) lub dodaj pętlę po stronach.
 */

import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import TurndownService from "turndown";

const AUTHOR_URL = "https://autogaleria.pl/author/marcin-bochenek/";
const BASE = "https://autogaleria.pl";
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");

const turndown = new TurndownService({ headingStyle: "atx" });
turndown.addRule("removeGalleryLinks", {
  filter: (node) => {
    const el = node as cheerio.Element;
    return el.tagName === "a" && el.attribs?.href?.includes("/gallery/");
  },
  replacement: () => ""
});

function slugFromUrl(url: string): string {
  const p = new URL(url, BASE).pathname.replace(/\/$/, "");
  return p.split("/").pop() ?? p.replace(/\//g, "-");
}

function escapeYamlString(s: string): string {
  if (s.includes("\n") || s.includes('"') || s.includes(":")) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "IDRIVECARS/1.0 (import treści; kontakt: idrivecars)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

async function getArticleUrlsFromAuthorPage(
  page = 1
): Promise<{ url: string; title: string; date: string }[]> {
  const url = page <= 1 ? AUTHOR_URL : `${AUTHOR_URL}${AUTHOR_URL.endsWith("/") ? "" : "/"}page/${page}/`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: { url: string; title: string; date: string }[] = [];

  $("article").each((_, article) => {
    const $art = $(article);
    const link = $art.find('a[href*="autogaleria.pl"]').filter((_, a) => {
      const href = (a as cheerio.Element).attribs?.href ?? "";
      const full = href.startsWith("http") ? href : new URL(href, BASE).href;
      const path = new URL(full).pathname.replace(/\/$/, "");
      return (
        full.startsWith(BASE) &&
        !path.includes("/author/") &&
        !path.includes("/category/") &&
        !path.includes("/tag/") &&
        !path.includes("/gallery/") &&
        path.split("/").filter(Boolean).length >= 1
      );
    }).first();
    const href = link.attr("href");
    if (!href) return;
    const fullUrl = href.startsWith("http") ? href : new URL(href, BASE).href;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);

    const title = $art.find(".entry-title a, h2 a, h3 a").first().text().trim() || link.text().trim();
    const dateEl = $art.find("time[datetime]").first();
    const date = dateEl.attr("datetime")?.slice(0, 10) || "";

    items.push({ url: fullUrl, title: title.slice(0, 300), date });
  });

  return items;
}

async function fetchArticle(url: string): Promise<{ title: string; date: string; bodyHtml: string }> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title =
    $("h1.entry-title").text().trim() ||
    $("article h1").first().text().trim() ||
    $("h1").first().text().trim() ||
    "";

  const dateEl = $("time[datetime]").first();
  const date = dateEl.attr("datetime")?.slice(0, 10) || "";

  let body =
    $(".entry-content").html() ||
    $("article .post-content").html() ||
    $(".post-content").html() ||
    $("article .content").html() ||
    "";

  if (!body && $("article").length) {
    const art = $("article").first();
    art.find("header, .entry-header, nav, script, .adsbygoogle").remove();
    body = art.html() || "";
  }

  return { title, date, bodyHtml: body };
}

async function main(): Promise<void> {
  console.log("Pobieranie listy artykułów z", AUTHOR_URL);
  const allArticles: { url: string; title: string; date: string }[] = [];
  const seenUrls = new Set<string>();

  for (let page = 1; page <= 5; page++) {
    const batch = await getArticleUrlsFromAuthorPage(page);
    let newCount = 0;
    for (const a of batch) {
      if (seenUrls.has(a.url)) continue;
      seenUrls.add(a.url);
      allArticles.push(a);
      newCount++;
    }
    if (newCount === 0) break;
    console.log("Strona", page, "– dodano", newCount, "artykułów");
    await delay(500);
  }

  const articles = allArticles;
  console.log("Łącznie artykułów:", articles.length);

  await fs.mkdir(CONTENT_DIR, { recursive: true });

  for (let i = 0; i < articles.length; i++) {
    const { url, title: listTitle, date: listDate } = articles[i];
    const slug = slugFromUrl(url);
    const mdxPath = path.join(CONTENT_DIR, `${slug}.mdx`);

    try {
      const existing = await fs.readFile(mdxPath, "utf8").catch(() => null);
      if (existing && existing.includes("originalUrl:")) {
        console.log(`[${i + 1}/${articles.length}] Pomijam (istnieje): ${slug}`);
        continue;
      }
    } catch {
      // ignore
    }

    console.log(`[${i + 1}/${articles.length}] ${slug}`);
    await delay(800);

    try {
      const { title, date, bodyHtml } = await fetchArticle(url);
      const bodyMarkdown = bodyHtml ? turndown.turndown(bodyHtml) : "";

      const brand = title.split(" ")[0] || "Marka";
      const model = title.replace(brand, "").trim().slice(0, 80) || "Model";

      const frontmatter = [
        `slug: ${escapeYamlString(slug)}`,
        `title: ${escapeYamlString(title)}`,
        `brand: ${escapeYamlString(brand)}`,
        `model: ${escapeYamlString(model)}`,
        `year: ${date ? Number(date.slice(0, 4)) : 2015}`,
        `publishedAt: "${date || "2015-01-01"}"`,
        `lead: ${escapeYamlString(bodyMarkdown.slice(0, 200).replace(/\n/g, " "))}`,
        `originalUrl: ${escapeYamlString(url)}`,
        `heroImage: "galleries/${slug}/hero.webp"`,
        `galleryDir: "galleries/${slug}"`
      ].join("\n");

      const content = `---\n${frontmatter}\n---\n\n${bodyMarkdown}`;
      await fs.writeFile(mdxPath, content, "utf8");
    } catch (err) {
      console.error("Błąd:", slug, err);
    }
  }

  console.log("Zakończono.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
