/**
 * Import artykułów Marcina Bochenka z autoGALERIA.pl do content/import/autogaleria.
 *
 * Paginacja autora: POST https://autogaleria.pl/api/index/autogaleria/_search?type=post
 * z filtrem author.key=marcin-bochenek (to samo co przycisk "Pokaż więcej").
 *
 * Uruchom: npm run import:autogaleria
 * Opcje: --dry-run | --no-images | --slug=porsche-boxster-s
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  discoverAuthorPosts,
  downloadImage,
  fetchPostByUrlKey,
  PAGINATION_INFO
} from "./lib/autogaleria-import/client";
import {
  articleToMarkdown,
  normalizePost,
  sanityCheckArticle
} from "./lib/autogaleria-import/parser";
import type { DiscoveredUrl, ImportReport, ProvenanceSource } from "./lib/autogaleria-import/types";

const AUTHOR_KEY = "marcin-bochenek";
const AUTHOR_NAME = "Marcin Bochenek";
const BASE = "https://autogaleria.pl";

const SEED_PATHS = [
  "rolls-royce-wraith",
  "porsche-911-targa-4s-pdk",
  "mercedes-c200-7g-tronic-plus",
  "bmw-435i",
  "porsche-boxster-s",
  "maserati-granturismo-sport",
  "bmw-328i-xdrive",
  "lexus-rx-350-f-sport",
  "wszystko-albo-nic",
  "moj-pierwszy-raz"
];

const ROOT = path.join(process.cwd(), "content", "import", "autogaleria");
const ARTICLES_JSON_DIR = path.join(ROOT, "articles", "json");
const ARTICLES_MD_DIR = path.join(ROOT, "articles", "markdown");
const CACHE_DIR = path.join(ROOT, "cache", "api");
const IMAGES_DIR = path.join(ROOT, "images");
const URL_MANIFEST = path.join(ROOT, "url-manifest.json");
const REPORT_PATH = path.join(ROOT, "import-report.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_IMAGES = args.includes("--no-images");
const SLUG_FILTER = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

function extFromUrl(url: string): string {
  const m = url.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
  return m ? `.${m[1].toLowerCase().replace("jpeg", "jpg")}` : ".jpg";
}

function dedupeUrls(urls: DiscoveredUrl[]): DiscoveredUrl[] {
  const map = new Map<string, DiscoveredUrl>();
  for (const item of urls) {
    const prev = map.get(item.urlKey);
    if (!prev) {
      map.set(item.urlKey, item);
      continue;
    }
    if (prev.discoveredVia === "elasticsearch-author") continue;
    map.set(item.urlKey, item);
  }
  return [...map.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

async function main(): Promise<void> {
  await fs.mkdir(ARTICLES_JSON_DIR, { recursive: true });
  await fs.mkdir(ARTICLES_MD_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const clientOpts = { cacheDir: CACHE_DIR, delayMs: 700 };
  const discoveredVia: Record<ProvenanceSource, number> = {
    "elasticsearch-author": 0,
    "author-nuxt-ssr": 0,
    "seed-url": 0,
    manual: 0
  };

  console.log("Odkrywanie artykułów autora przez Elasticsearch…");
  const { urls: esUrls, total } = await discoverAuthorPosts(AUTHOR_KEY, clientOpts);
  for (const u of esUrls) discoveredVia["elasticsearch-author"]++;

  const seedUrls: DiscoveredUrl[] = SEED_PATHS.map((urlKey) => ({
    urlKey,
    sourceUrl: `${BASE}/${urlKey}`,
    discoveredVia: "seed-url" as const
  }));
  for (const u of seedUrls) discoveredVia["seed-url"]++;

  const allUrls = dedupeUrls([...esUrls, ...seedUrls]);
  const targets = SLUG_FILTER ? allUrls.filter((u) => u.urlKey === SLUG_FILTER) : allUrls;

  await fs.writeFile(
    URL_MANIFEST,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        authorKey: AUTHOR_KEY,
        totalListed: allUrls.length,
        elasticsearchTotal: total,
        items: allUrls
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Znaleziono ${allUrls.length} unikalnych URL-i (ES total: ${total}).`);

  const failures: ImportReport["failures"] = [];
  const missingOrUncertain: string[] = [];
  const seedChecks: ImportReport["seedUrlsChecked"] = [];
  let fetchedOk = 0;
  let fetchedFailed = 0;
  let skippedCached = 0;

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    const jsonPath = path.join(ARTICLES_JSON_DIR, `${item.urlKey}.json`);
    const mdPath = path.join(ARTICLES_MD_DIR, `${item.urlKey}.md`);

    if (!SLUG_FILTER && existsSync(jsonPath) && existsSync(mdPath)) {
      skippedCached++;
      console.log(`[${i + 1}/${targets.length}] cache hit: ${item.urlKey}`);
      continue;
    }

    console.log(`[${i + 1}/${targets.length}] ${item.urlKey}`);
    if (DRY_RUN) continue;

    try {
      const post = await fetchPostByUrlKey(item.urlKey, clientOpts);
      if (post.author?.key && post.author.key !== AUTHOR_KEY) {
        missingOrUncertain.push(`${item.urlKey}: autor API=${post.author.key}`);
      }

      const article = normalizePost(post, item.discoveredVia);
      const issues = sanityCheckArticle(article);
      if (issues.length) missingOrUncertain.push(`${item.urlKey}: ${issues.join(", ")}`);

      if (SEED_PATHS.includes(item.urlKey)) {
        seedChecks.push({
          url: item.sourceUrl,
          urlKey: item.urlKey,
          status: issues.length ? "failed" : "ok",
          author: post.author?.key
        });
      }

      const imageCache: string[] = [];
      if (!NO_IMAGES) {
        const toCache = [
          article.images.thumbnail,
          ...article.images.gallery.slice(0, 3)
        ].filter(Boolean) as string[];

        for (let imgIdx = 0; imgIdx < toCache.length; imgIdx++) {
          const imgUrl = toCache[imgIdx];
          const ext = extFromUrl(imgUrl);
          const rel = path.join(item.urlKey, `${imgIdx === 0 ? "hero" : `gallery-${imgIdx}`}${ext}`);
          const dest = path.join(IMAGES_DIR, rel);
          const ok = await downloadImage(imgUrl, dest, clientOpts);
          if (ok) imageCache.push(rel.replace(/\\/g, "/"));
        }
      }

      const payload = { ...article, imageCacheLocal: imageCache };
      await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), "utf8");
      await fs.writeFile(mdPath, articleToMarkdown(article), "utf8");
      fetchedOk++;
    } catch (err) {
      fetchedFailed++;
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ urlKey: item.urlKey, sourceUrl: item.sourceUrl, error: message });
      console.error("  Błąd:", message);
    }
  }

  if (total > allUrls.length) {
    missingOrUncertain.push(`ES zgłosiło ${total} pozycji, zebrano ${allUrls.length} urlKey — sprawdź duplikaty lub zmiany indeksu.`);
  }

  const report: ImportReport = {
    generatedAt: new Date().toISOString(),
    authorKey: AUTHOR_KEY,
    authorName: AUTHOR_NAME,
    pagination: {
      ...PAGINATION_INFO,
      totalFromIndex: total
    },
    counts: {
      discoveredUrls: esUrls.length + seedUrls.length,
      uniqueUrls: allUrls.length,
      fetchedOk,
      fetchedFailed,
      skippedCached
    },
    discoveredVia,
    failures,
    missingOrUncertain,
    seedUrlsChecked: seedChecks,
    outputDirs: {
      articlesJson: path.relative(process.cwd(), ARTICLES_JSON_DIR),
      articlesMarkdown: path.relative(process.cwd(), ARTICLES_MD_DIR),
      cache: path.relative(process.cwd(), CACHE_DIR),
      images: path.relative(process.cwd(), IMAGES_DIR),
      urlManifest: path.relative(process.cwd(), URL_MANIFEST),
      report: path.relative(process.cwd(), REPORT_PATH)
    },
    scripts: [
      "scripts/import-autogaleria-marcin.ts",
      "scripts/sanity-check-autogaleria-parser.ts",
      "scripts/convert-autogaleria-images.ts"
    ]
  };

  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("\n--- Podsumowanie importu ---");
  console.log("Unikalne URL-e:", allUrls.length);
  console.log("Pobrane OK:", fetchedOk, "| błędy:", fetchedFailed, "| pominięte (cache):", skippedCached);
  console.log("Raport:", path.relative(process.cwd(), REPORT_PATH));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
