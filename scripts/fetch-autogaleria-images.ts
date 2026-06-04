/**
 * Pobiera listę artykułów Marcina Bochenka z autogaleria.pl,
 * dopasowuje do lokalnych MDX bez galerii, pobiera zdjęcia i aktualizuje frontmatter.
 *
 * Uruchom: npm run fetch:ag-images
 * Opcje: --dry-run | --list-only | --slug=ford-fiesta
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import matter from "gray-matter";
import sharp from "sharp";
import manifest from "../src/data/galleries-manifest.json";

const AUTHOR_URL = "https://autogaleria.pl/author/marcin-bochenek";
const BASE = "https://autogaleria.pl";
const USER_AGENT = "IDRIVECARS/1.0 (gallery import; kontakt: idrivecars)";
const DELAY_MS = 850;
const DATA_DIR = path.join(process.cwd(), "scripts", "data");
const ARTICLES_JSON = path.join(DATA_DIR, "autogaleria-articles.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const GALLERIES_DIR = path.join(process.cwd(), "public", "galleries");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIST_ONLY = args.includes("--list-only");
const SLUG_FILTER = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

type AgArticle = { url: string; slug: string; title: string; date: string };
type LocalArticle = { slug: string; title: string; mdxPath: string; galleryDir?: string; originalUrl?: string };
type MatchResult = { local: LocalArticle; ag: AgArticle; match: "slug" | "title" | "probe" | "sitemap" };

const manifestMap = manifest as Record<string, unknown[]>;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function slugFromPath(href: string): string {
  const p = href.replace(/\/$/, "").split("/").filter(Boolean);
  return p[p.length - 1] ?? href;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const na = new Set(normalizeTitle(a).split(" ").filter((w) => w.length > 2));
  const nb = new Set(normalizeTitle(b).split(" ").filter((w) => w.length > 2));
  if (!na.size || !nb.size) return 0;
  let inter = 0;
  for (const w of na) if (nb.has(w)) inter++;
  return inter / Math.max(na.size, nb.size);
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow"
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function decodeJsString(s: string): string {
  return s.replace(/\\u([\da-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Parsuje listę z window.__NUXT__.state.author.posts (SSR: pierwsza partia). */
function parseAuthorFromNuxt(html: string): AgArticle[] | null {
  const marker = "author:{posts:[";
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const chunk = html.slice(idx, idx + 900_000);
  const urlKeys = [...chunk.matchAll(/urlKey:"([^"]+)"/g)].map((m) => m[1]);
  const titles = [...chunk.matchAll(/title:"((?:\\.|[^"\\])*)"/g)].map((m) =>
    decodeJsString(m[1])
  );
  const dates = [...chunk.matchAll(/date:"(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  if (!urlKeys.length) return null;

  const posts: AgArticle[] = [];
  for (let i = 0; i < urlKeys.length; i++) {
    posts.push({
      slug: urlKeys[i],
      title: titles[i] ?? urlKeys[i],
      date: dates[i] ?? "",
      url: `${BASE}/${urlKeys[i]}`
    });
  }
  return posts;
}

/** Fallback: parsuje widoczne kafelki HTML. */
function parseAuthorPageHtml(html: string): AgArticle[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const items: AgArticle[] = [];

  $('a.p-tile-title[href], a[class*="p-tile-title"][href]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.includes("/author/") || href.includes("/category/")) return;
    const slug = slugFromPath(href.startsWith("http") ? new URL(href).pathname : href);
    if (!slug || slug.includes("gallery")) return;
    const fullUrl = href.startsWith("http") ? href : `${BASE}/${slug}`;
    if (seen.has(slug)) return;
    seen.add(slug);
    const title =
      $(el).attr("title")?.trim() ||
      $(el).find("strong").text().trim() ||
      $(el).text().trim();
    const $article = $(el).closest("article");
    const date =
      $article.find("time[datetime]").attr("datetime")?.slice(0, 10) ||
      $article.find(".p-meta__date").text().trim() ||
      "";
    items.push({ url: fullUrl.replace(/\/$/, ""), slug, title, date });
  });

  return items;
}

async function fetchSitemapSlugs(): Promise<string[]> {
  const cached = path.join(DATA_DIR, "autogaleria-sitemap-slugs.json");
  if (existsSync(cached)) {
    const age = Date.now() - (await fs.stat(cached)).mtimeMs;
    if (age < 7 * 24 * 3600_000) {
      return JSON.parse(await fs.readFile(cached, "utf8")) as string[];
    }
  }

  const indexHtml = await fetchHtml(`${BASE}/sitemap.xml`);
  const postMaps = [...indexHtml.matchAll(/<loc>(https:\/\/autogaleria\.pl\/sitemap-post-\d+\.xml)<\/loc>/g)].map(
    (m) => m[1]
  );

  const slugs = new Set<string>();
  for (let i = 0; i < postMaps.length; i++) {
    const xml = await fetchHtml(postMaps[i]);
    for (const m of xml.matchAll(/<loc>https:\/\/autogaleria\.pl\/([^<]+)<\/loc>/g)) {
      const seg = m[1].replace(/\/$/, "");
      if (!seg.includes("/") && !seg.startsWith("category") && !seg.includes("gallery")) {
        slugs.add(seg);
      }
    }
    if (i < postMaps.length - 1) await delay(400);
  }

  const list = [...slugs].sort();
  await fs.writeFile(cached, JSON.stringify(list, null, 0), "utf8");
  console.log("  Sitemap:", list.length, "slugów →", path.relative(process.cwd(), cached));
  return list;
}

const SLUG_STOP_WORDS = new Set([
  "pierwsza",
  "jazda",
  "test",
  "vs",
  "fl",
  "nd",
  "nowy",
  "nowa",
  "nowe",
  "do",
  "na",
  "i",
  "the",
  "galeria",
  "film"
]);

function findSitemapSlug(localSlug: string, sitemapSlugs: string[]): string | null {
  if (sitemapSlugs.includes(localSlug)) return localSlug;
  const parts = localSlug.split("-").filter((p) => p.length > 2 && !SLUG_STOP_WORDS.has(p));
  if (!parts.length) return null;

  const candidates = sitemapSlugs.filter((s) => parts.every((p) => s.includes(p)));

  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const da = Math.abs(a.length - localSlug.length);
    const db = Math.abs(b.length - localSlug.length);
    return da - db || a.localeCompare(b);
  });
  return candidates[0];
}

async function fetchAllAuthorArticles(): Promise<AgArticle[]> {
  console.log("Pobieranie listy autora (NUXT SSR)…");
  const html = await fetchHtml(AUTHOR_URL);
  const fromNuxt = parseAuthorFromNuxt(html);
  if (fromNuxt?.length) {
    console.log("  __NUXT__ author.posts:", fromNuxt.length, "artykułów");
    return fromNuxt;
  }

  console.warn("  Brak __NUXT__ — fallback HTML");
  const all: AgArticle[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 15; page++) {
    const url = page <= 1 ? AUTHOR_URL : `${AUTHOR_URL}/page/${page}`;
    let pageHtml: string;
    try {
      pageHtml = await fetchHtml(url);
    } catch (err) {
      if (page > 1 && String(err).includes("404")) break;
      throw err;
    }
    const batch = parseAuthorPageHtml(pageHtml);
    let added = 0;
    for (const a of batch) {
      if (seen.has(a.slug)) continue;
      seen.add(a.slug);
      all.push(a);
      added++;
    }
    if (added === 0) break;
    await delay(500);
  }
  return all;
}

function pathnameFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

/** Pełna galeria ze strony /slug/gallery/1 (SSR). */
function extractGalleryPageImages(html: string): string[] {
  const paths = new Set<string>();
  const $ = cheerio.load(html);
  $(".gallery__track img[src], img.gallery-item[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (!src?.includes("/content/uploads/")) return;
    const p = src.startsWith("http") ? pathnameFromUrl(src) : src;
    if (p) paths.add(p);
  });
  if (paths.size) return [...paths];

  const keyMatch = html.match(/urlKey:"([^"]+)"/);
  if (keyMatch) {
    const key = keyMatch[1];
    const idx = html.indexOf(`urlKey:"${key}"`);
    const slice = html.slice(Math.max(0, idx - 120_000), idx + 500);
    const g = slice.match(/gallery:\[([\s\S]*?)\],isHot/);
    if (g) {
      const decoded = g[1].replace(/\\u002F/g, "/");
      for (const m of decoded.matchAll(/\/content\/uploads\/[^"]+\.(?:jpg|jpeg|webp|png)/gi)) {
        paths.add(m[0]);
      }
    }
  }
  return [...paths];
}

/** Fallback: zdjęcia z treści artykułu. */
function extractArticleInlineImages(html: string): string[] {
  const paths = new Set<string>();
  const re =
    /(?:https?:\/\/autogaleria\.pl)?\/content\/uploads\/\d{4}\/\d{2}\/[^\s"'<>]+\.(?:jpg|jpeg|webp|png)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let p = m[0];
    if (p.startsWith("http")) p = pathnameFromUrl(p) ?? p;
    if (p.includes("-150x") || p.includes("-300x")) continue;
    paths.add(p);
  }
  return [...paths];
}

async function fetchGalleryImagePaths(agSlug: string): Promise<string[]> {
  const galleryUrl = `${BASE}/${agSlug}/gallery/1`;
  try {
    const html = await fetchHtml(galleryUrl);
    if (html.includes("page--error") || html.includes("Strony nie znaleziono")) return [];
    const imgs = extractGalleryPageImages(html);
    if (imgs.length) return imgs;
  } catch {
    // brak galerii — spróbuj stronę artykułu
  }

  await delay(400);
  try {
    const articleHtml = await fetchHtml(`${BASE}/${agSlug}`);
    if (articleHtml.includes("page--error")) return [];
    return extractArticleInlineImages(articleHtml);
  } catch {
    return [];
  }
}

function articleHasImages(html: string): boolean {
  return extractGalleryPageImages(html).length > 0 || extractArticleInlineImages(html).length > 0;
}

/** Sprawdza slug na AG — tylko gdy są zdjęcia do pobrania. */
async function probeAgArticle(local: LocalArticle, agSlug: string): Promise<AgArticle | null> {
  const galleryUrl = `${BASE}/${agSlug}/gallery/1`;
  try {
    const gHtml = await fetchHtml(galleryUrl);
    if (!gHtml.includes("page--error") && articleHasImages(gHtml)) {
      const title = cheerio.load(gHtml)("h1").first().text().trim() || local.title;
      return { slug: agSlug, title, date: "", url: `${BASE}/${agSlug}` };
    }
  } catch {
    // ignore
  }

  await delay(400);
  try {
    const html = await fetchHtml(`${BASE}/${agSlug}`);
    if (html.includes("page--error") || !html.includes("Marcin Bochenek")) return null;
    if (!articleHasImages(html)) return null;
    const title = cheerio.load(html)("h1.title-1").first().text().trim() || local.title;
    return { slug: agSlug, title, date: "", url: `${BASE}/${agSlug}` };
  } catch {
    return null;
  }
}

function toAbsoluteImageUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) return relativePath;
  return `${BASE}${relativePath.startsWith("/") ? "" : "/"}${relativePath}`;
}

async function downloadImages(
  imagePaths: string[],
  outDir: string
): Promise<number> {
  await fs.mkdir(outDir, { recursive: true });
  let saved = 0;

  const sorted = [...imagePaths].sort((a, b) => a.localeCompare(b, "pl"));

  for (let i = 0; i < sorted.length; i++) {
    const rel = sorted[i];
    const url = toAbsoluteImageUrl(rel);
    const outName = `${String(i + 1).padStart(3, "0")}.webp`;
    const outPath = path.join(outDir, outName);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow"
      });
      if (!res.ok) {
        console.warn("  pomijam (HTTP", res.status + "):", path.basename(rel));
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await sharp(buf).rotate().webp({ quality: 82, effort: 4 }).toFile(outPath);
      saved++;
      if (i < sorted.length - 1) await delay(200);
    } catch (err) {
      console.warn("  błąd pobierania", rel, err);
    }
  }

  return saved;
}

async function updateMdxFrontmatter(
  mdxPath: string,
  updates: { originalUrl?: string; galleryDir?: string; heroImage?: string }
): Promise<void> {
  const raw = await fs.readFile(mdxPath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  if (updates.originalUrl && (!data.originalUrl || data.originalUrl === "")) {
    data.originalUrl = updates.originalUrl;
  }
  if (updates.galleryDir) data.galleryDir = updates.galleryDir;
  if (updates.heroImage) data.heroImage = updates.heroImage;

  const lines = Object.entries(data).map(([k, v]) => {
    if (typeof v === "string") return `${k}: "${String(v).replace(/"/g, '\\"')}"`;
    if (Array.isArray(v)) return `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`;
    return `${k}: ${v}`;
  });

  await fs.writeFile(mdxPath, `---\n${lines.join("\n")}\n---\n${parsed.content}`, "utf8");
}

async function loadLocalArticles(): Promise<LocalArticle[]> {
  const files = (await fs.readdir(CONTENT_DIR)).filter(
    (f) => f.endsWith(".mdx") && f !== "przykladowy-test.mdx"
  );
  const out: LocalArticle[] = [];

  for (const f of files) {
    const slug = f.replace(/\.mdx$/, "");
    const mdxPath = path.join(CONTENT_DIR, f);
    const { data } = matter(await fs.readFile(mdxPath, "utf8"));
    const galleryDir = data.galleryDir as string | undefined;
    const gslug = galleryDir?.replace(/^galleries[\\/]/, "").replace(/\\/g, "/");
    const hasManifest = gslug && (manifestMap[gslug]?.length ?? 0) > 0;

    if (hasManifest) continue;

    out.push({
      slug,
      title: (data.title as string) || slug,
      mdxPath,
      galleryDir,
      originalUrl: data.originalUrl as string | undefined
    });
  }

  return out;
}

function matchArticles(agList: AgArticle[], localList: LocalArticle[]): MatchResult[] {
  const matches: MatchResult[] = [];
  const usedAg = new Set<string>();

  for (const local of localList) {
    const bySlug = agList.find((a) => a.slug === local.slug);
    if (bySlug && !usedAg.has(bySlug.slug)) {
      matches.push({ local, ag: bySlug, match: "slug" });
      usedAg.add(bySlug.slug);
      continue;
    }
  }

  for (const local of localList) {
    if (matches.some((m) => m.local.slug === local.slug)) continue;
    let best: { ag: AgArticle; score: number } | null = null;
    for (const ag of agList) {
      if (usedAg.has(ag.slug)) continue;
      const score = titleSimilarity(local.title, ag.title);
      if (score >= 0.55 && (!best || score > best.score)) best = { ag, score };
    }
    if (best) {
      matches.push({ local, ag: best.ag, match: "title" });
      usedAg.add(best.ag.slug);
    }
  }

  return matches;
}

async function hasLocalGalleryFiles(slug: string): Promise<boolean> {
  const dir = path.join(GALLERIES_DIR, slug);
  if (!existsSync(dir)) return false;
  try {
    const files = await fs.readdir(dir);
    return files.some((f) => f.toLowerCase().endsWith(".webp"));
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log("=== fetch-autogaleria-images ===");
  if (DRY_RUN) console.log("(tryb --dry-run)\n");

  await fs.mkdir(DATA_DIR, { recursive: true });

  let agArticles: AgArticle[];
  try {
    agArticles = await fetchAllAuthorArticles();
    await fs.writeFile(ARTICLES_JSON, JSON.stringify(agArticles, null, 2), "utf8");
    console.log("\nZapisano", agArticles.length, "artykułów →", path.relative(process.cwd(), ARTICLES_JSON));
  } catch (err) {
    console.error("Błąd pobierania listy autora:", err);
    if (existsSync(ARTICLES_JSON)) {
      console.log("Używam zapisanego", ARTICLES_JSON);
      agArticles = JSON.parse(await fs.readFile(ARTICLES_JSON, "utf8")) as AgArticle[];
    } else {
      throw err;
    }
  }

  if (LIST_ONLY) {
    console.log("\nLista (slug | tytuł | data):");
    for (const a of agArticles) console.log(a.slug, "|", a.title.slice(0, 60), "|", a.date);
    return;
  }

  let localNeeding = await loadLocalArticles();
  if (SLUG_FILTER) {
    localNeeding = localNeeding.filter((l) => l.slug === SLUG_FILTER);
    console.log("Filtr slug:", SLUG_FILTER, "→", localNeeding.length, "artykułów");
  }
  console.log("\nLokalne bez galerii w manifeście:", localNeeding.length);

  let matches = matchArticles(agArticles, localNeeding);
  let sitemapSlugs: string[] = [];
  try {
    console.log("\nIndeks sitemap (cache 7 dni)…");
    sitemapSlugs = await fetchSitemapSlugs();
  } catch (err) {
    console.warn("  Sitemap niedostępny:", err);
  }

  const matchedLocals = new Set(matches.map((m) => m.local.slug));
  let toResolve = localNeeding.filter((l) => !matchedLocals.has(l.slug));

  if (sitemapSlugs.length) {
    for (const local of toResolve) {
      const agSlug = findSitemapSlug(local.slug, sitemapSlugs);
      if (!agSlug) continue;
      const existing = agArticles.find((a) => a.slug === agSlug);
      if (existing) {
        matches.push({ local, ag: existing, match: "sitemap" });
        matchedLocals.add(local.slug);
      } else {
        matches.push({
          local,
          ag: { slug: agSlug, title: local.title, date: "", url: `${BASE}/${agSlug}` },
          match: "sitemap"
        });
        matchedLocals.add(local.slug);
      }
    }
    console.log("Dopasowania sitemap:", matches.filter((m) => m.match === "sitemap").length);
  }

  toResolve = localNeeding.filter((l) => !matchedLocals.has(l.slug));
  console.log("Dopasowania z autora:", matches.filter((m) => m.match !== "sitemap" && m.match !== "probe").length, "| do probe:", toResolve.length);

  for (let i = 0; i < toResolve.length; i++) {
    const local = toResolve[i];
    if (DRY_RUN) continue;
    await delay(DELAY_MS);
    const found = await probeAgArticle(local, local.slug);
    if (found) {
      matches.push({ local, ag: found, match: "probe" });
      console.log("  [probe OK]", local.slug, "→", found.url);
    }
  }

  console.log("Łącznie dopasowań do pobrania:", matches.length);
  const stats = { downloaded: 0, skipped: 0, failed: 0, images: 0, probeOk: 0 };

  for (let i = 0; i < matches.length; i++) {
    const { local, ag, match } = matches[i];
    const gallerySlug = local.slug;
    const outDir = path.join(GALLERIES_DIR, gallerySlug);

    if (await hasLocalGalleryFiles(gallerySlug)) {
      console.log(`[${i + 1}/${matches.length}] ${local.slug} — pomijam (już są pliki WEBP)`);
      stats.skipped++;
      continue;
    }

    console.log(
      `[${i + 1}/${matches.length}] ${local.slug} ← ${ag.slug} (${match}, ${ag.title.slice(0, 50)}…)`
    );

    if (DRY_RUN) continue;

    await delay(DELAY_MS);

    try {
      const imagePaths = await fetchGalleryImagePaths(ag.slug);
      if (!imagePaths.length) {
        console.warn("  brak zdjęć (galeria + artykuł)");
        stats.failed++;
        continue;
      }

      if (match === "probe") stats.probeOk++;
      console.log("  znaleziono", imagePaths.length, "ścieżek");
      const saved = await downloadImages(imagePaths, outDir);
      if (!saved) {
        console.warn("  nie pobrano żadnego pliku");
        stats.failed++;
        continue;
      }

      stats.downloaded++;
      stats.images += saved;

      await updateMdxFrontmatter(local.mdxPath, {
        originalUrl: ag.url,
        galleryDir: `galleries/${gallerySlug}`,
        heroImage: `galleries/${gallerySlug}/001.webp`
      });
      console.log("  zapisano", saved, "WEBP →", path.relative(process.cwd(), outDir));
    } catch (err) {
      console.error("  błąd:", err);
      stats.failed++;
    }
  }

  console.log("\n--- Podsumowanie ---");
  console.log("Artykuły AG:", agArticles.length);
  console.log("Dopasowania:", matches.length);
  console.log("Pobrane galerie:", stats.downloaded);
  console.log("Zdjęcia łącznie:", stats.images);
  console.log("Pominięte (już pliki):", stats.skipped);
  console.log("Nieudane:", stats.failed);
  console.log("Odkryte przez probe:", stats.probeOk);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
