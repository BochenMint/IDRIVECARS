import * as cheerio from "cheerio";
import TurndownService from "turndown";
import type { AgPostApi, NormalizedArticle, ProvenanceSource } from "./types";
import { isAbsurdProsCons, sanitizeProsConsList } from "./pros-cons";

const BASE = "https://autogaleria.pl";

const turndown = new TurndownService({ headingStyle: "atx" });
turndown.addRule("preserveYoutube", {
  filter: (node) => {
    const el = node as cheerio.Element;
    return el.tagName === "iframe" && (el.attribs?.src ?? "").includes("youtube");
  },
  replacement: (_content, node) => {
    const src = (node as cheerio.Element).attribs?.src ?? "";
    return `\n\n[YouTube](${src})\n\n`;
  }
});

export function absUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  if (pathOrUrl.startsWith("//")) return `https:${pathOrUrl}`;
  return `${BASE}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

function stripHtml(html: string): string {
  return cheerio.load(html).text().replace(/\s+/g, " ").trim();
}

function extractListAfterLabel(html: string, labels: string[]): string[] {
  const $ = cheerio.load(`<div>${html}</div>`);
  const items: string[] = [];
  const text = $.root().text();

  for (const label of labels) {
    // Colon required — avoids matching incidental "wady" in prose ("A jakie RAV4 ma wady?").
    const re = new RegExp(
      `(?:^|[\\n>])\\s*(?:<b>\\s*)?${label}\\s*:\\s*([\\s\\S]*?)(?=(?:[\\n>]|$)\\s*(?:<b>\\s*)?(?:Zalety|Wady|Podsumowanie|Plusy|Minusy)\\s*:|$)`,
      "i"
    );
    const m = text.match(re);
    if (!m) continue;
    const block = m[1];
    for (const line of block.split(/\n|<br\s*\/?>/i)) {
      const cleaned = line
        .replace(/^[\s>*•\-+]+/, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      if (cleaned.length > 2) items.push(cleaned);
    }
  }
  return items;
}

function extractProsConsSummaryFromHtml(bodyHtml: string): {
  pros: string[];
  cons: string[];
  summary: string;
} {
  const $ = cheerio.load(bodyHtml);
  let pros: string[] = [];
  let cons: string[] = [];
  let summary = "";

  $("p, div").each((_, el) => {
    const html = $(el).html() ?? "";
    const plain = $(el).text().trim();
    if (/^zalety\s*:?$/i.test(plain.replace(/:$/, ""))) return;
    if (/<b>\s*zalety\s*:?\s*<\/b>/i.test(html) || /^zalety\s*:/i.test(plain)) {
      pros = extractLinesFromBlock(html);
    }
    if (/<b>\s*wady\s*:?\s*<\/b>/i.test(html) || /^wady\s*:/i.test(plain)) {
      cons = extractLinesFromBlock(html);
    }
    if (/<b>\s*podsumowanie\s*:?\s*<\/b>/i.test(html) || /^podsumowanie\s*:/i.test(plain)) {
      summary = extractLinesFromBlock(html).join(" ").trim();
    }
  });

  if (!pros.length) pros = extractListAfterLabel(bodyHtml, ["Zalety", "Plusy"]);
  if (!cons.length) cons = extractListAfterLabel(bodyHtml, ["Wady", "Minusy"]);
  if (!summary) {
    const m = cheerio.load(bodyHtml).root().text().match(/Podsumowanie\s*:\s*([\s\S]+)/i);
    if (m) summary = m[1].trim().split(/\n/)[0]?.trim() ?? "";
  }

  return { pros, cons, summary };
}

function extractLinesFromBlock(html: string): string[] {
  const items: string[] = [];
  const parts = html.split(/<br\s*\/?>/i);
  for (const part of parts) {
    const line = stripHtml(part).replace(/^(zalety|wady|podsumowanie)\s*:?\s*/i, "").trim();
    if (!line || /^(zalety|wady|podsumowanie)\s*:?$/i.test(line)) continue;
    const normalized = line.replace(/^[+•\-]\s*/, "").trim();
    if (normalized.length > 1) items.push(normalized);
  }
  return items;
}

export function extractHeadings(bodyHtml: string): Array<{ level: number; text: string }> {
  const $ = cheerio.load(bodyHtml);
  const headings: Array<{ level: number; text: string }> = [];
  $("h1, h2, h3, h4").each((_, el) => {
    const tag = (el as cheerio.Element).tagName?.toLowerCase();
    const level = Number(tag?.replace("h", "")) || 2;
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) headings.push({ level, text });
  });
  return headings;
}

export function extractYoutube(bodyHtml: string): Array<{ videoId: string; url: string; embedUrl: string }> {
  const found = new Map<string, { videoId: string; url: string; embedUrl: string }>();
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/g,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/g,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/g
  ];
  for (const re of patterns) {
    for (const m of bodyHtml.matchAll(re)) {
      const videoId = m[1];
      found.set(videoId, {
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      });
    }
  }
  return [...found.values()];
}

export function extractInlineImages(bodyHtml: string): string[] {
  const $ = cheerio.load(bodyHtml);
  const urls = new Set<string>();
  $("img[src]").each((_, el) => {
    const src = absUrl($(el).attr("src"));
    if (src) urls.add(src);
  });
  return [...urls];
}

export function normalizePost(
  post: AgPostApi,
  discoveredVia: ProvenanceSource
): NormalizedArticle {
  const bodyHtml = post.body ?? "";
  const parsed = extractProsConsSummaryFromHtml(bodyHtml);
  const apiPros = sanitizeProsConsList(post.pros);
  const apiCons = sanitizeProsConsList(post.cons);
  const htmlPros = sanitizeProsConsList(parsed.pros);
  const htmlCons = sanitizeProsConsList(parsed.cons);

  let pros = apiPros.length ? apiPros : htmlPros;
  let cons = apiCons.length ? apiCons : htmlCons;

  if (isAbsurdProsCons(post.pros) && !htmlPros.length) pros = [];
  if (isAbsurdProsCons(post.cons) && !htmlCons.length) cons = [];
  if (isAbsurdProsCons(pros)) pros = htmlPros;
  if (isAbsurdProsCons(cons)) cons = htmlCons;

  pros = sanitizeProsConsList(pros);
  cons = sanitizeProsConsList(cons);

  const summary = parsed.summary;
  const headings = extractHeadings(bodyHtml);
  const youtube = extractYoutube(bodyHtml);
  const inline = extractInlineImages(bodyHtml);
  const gallery = (post.gallery ?? []).map((g) => absUrl(g)).filter(Boolean) as string[];
  const thumbnail = absUrl(post.thumbnail);
  const category = post.categories?.[0]?.name ?? post.path?.[0]?.name ?? "";
  const publishedAt = (post.date ?? "").slice(0, 10) || "1970-01-01";
  const excerpt = post.excerpt ?? post.meta?.description ?? "";
  const lead = stripHtml(excerpt || bodyHtml).slice(0, 320);
  const bodyMarkdown = bodyHtml ? turndown.turndown(bodyHtml) : "";

  return {
    slug: post.urlKey,
    urlKey: post.urlKey,
    sourceUrl: `${BASE}/${post.urlKey}`,
    provenance: {
      discoveredVia,
      importedAt: new Date().toISOString(),
      importer: "scripts/import-autogaleria-marcin.ts",
      rightsNote:
        "Treść zaimportowana z autoGALERIA.pl na podstawie deklaracji właściciela; canonical URL zachowany w sourceUrl."
    },
    title: post.title,
    excerpt: stripHtml(excerpt),
    lead,
    category,
    categories: post.categories ?? [],
    tags: (post.tags ?? []).map((t) => t.name),
    publishedAt,
    author: {
      name: post.author?.name ?? "Marcin Bochenek",
      key: post.author?.key ?? "marcin-bochenek"
    },
    headings,
    bodyHtml,
    bodyMarkdown,
    pros,
    cons,
    summary,
    youtube,
    images: {
      thumbnail,
      gallery,
      inline,
      absolute: { thumbnail, gallery, inline }
    },
    tables: post.tables ?? [],
    meta: {
      title: post.meta?.title ?? post.title,
      description: post.meta?.description ?? stripHtml(excerpt)
    },
    cars: (post.cars ?? []).map((c) => c.name)
  };
}

export function articleToMarkdown(article: NormalizedArticle): string {
  const yamlEscape = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const lines = [
    "---",
    `slug: ${yamlEscape(article.slug)}`,
    `title: ${yamlEscape(article.title)}`,
    `publishedAt: "${article.publishedAt}"`,
    `category: ${yamlEscape(article.category)}`,
    `author: ${yamlEscape(article.author.name)}`,
    `sourceUrl: ${yamlEscape(article.sourceUrl)}`,
    `discoveredVia: ${yamlEscape(article.provenance.discoveredVia)}`,
    `lead: ${yamlEscape(article.lead)}`,
    `tags: [${article.tags.map((t) => yamlEscape(t)).join(", ")}]`,
    "---",
    "",
    article.bodyMarkdown
  ];
  if (article.pros.length) {
    lines.push("", "## Zalety", "", ...article.pros.map((p) => `- ${p}`));
  }
  if (article.cons.length) {
    lines.push("", "## Wady", "", ...article.cons.map((c) => `- ${c}`));
  }
  if (article.summary) {
    lines.push("", "## Podsumowanie", "", article.summary);
  }
  return lines.join("\n");
}

/** Sanity-check helper used by import script and tests. */
export function sanityCheckArticle(article: NormalizedArticle): string[] {
  const issues: string[] = [];
  if (!article.title) issues.push("brak tytułu");
  if (!article.bodyMarkdown || article.bodyMarkdown.length < 80) issues.push("za krótki bodyMarkdown");
  if (!article.sourceUrl.startsWith(BASE)) issues.push("nieprawidłowy sourceUrl");
  if (article.author.key !== "marcin-bochenek") issues.push(`autor: ${article.author.key}`);
  if (isAbsurdProsCons(article.pros)) issues.push(`pros za długie (${article.pros.length} poz., max ${article.pros.reduce((m, p) => Math.max(m, p.length), 0)} znaków)`);
  if (isAbsurdProsCons(article.cons)) issues.push(`cons za długie (${article.cons.length} poz., max ${article.cons.reduce((m, c) => Math.max(m, c.length), 0)} znaków)`);
  return issues;
}
