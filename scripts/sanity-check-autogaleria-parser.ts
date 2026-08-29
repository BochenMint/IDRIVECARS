/**
 * Sanity-check parsera autoGALERIA na przykładowych artykułach.
 * Uruchom: npm run import:autogaleria:check
 */

import path from "node:path";
import { fetchPostByUrlKey } from "./lib/autogaleria-import/client";
import { normalizePost, sanityCheckArticle } from "./lib/autogaleria-import/parser";
import { isAbsurdProsCons } from "./lib/autogaleria-import/pros-cons";
import type { AgPostApi } from "./lib/autogaleria-import/types";

const EXAMPLES = [
  "porsche-boxster-s",
  "bmw-328i-xdrive",
  "lexus-rx-350-f-sport",
  "rolls-royce-wraith",
  "wszystko-albo-nic",
  "moj-pierwszy-raz"
];

/** Known-bad fixtures from staged JSON (offline, no API). */
const OFFLINE_FIXTURES = ["lexus-nx-300h-awd-f-sport", "volvo-xc90-kubel-szwedzkiej-wody"];

const CACHE_DIR = path.join(process.cwd(), "content", "import", "autogaleria", "cache", "api");
const JSON_DIR = path.join(process.cwd(), "content", "import", "autogaleria", "articles", "json");

async function checkOfflineFixture(urlKey: string): Promise<boolean> {
  const file = path.join(JSON_DIR, `${urlKey}.json`);
  const raw = JSON.parse(await import("node:fs/promises").then((m) => m.readFile(file, "utf8"))) as {
    title: string;
    urlKey: string;
    bodyHtml?: string;
    bodyMarkdown?: string;
    pros?: string[];
    cons?: string[];
    publishedAt?: string;
  };
  const post: AgPostApi = {
    id: 0,
    title: raw.title,
    urlKey: raw.urlKey ?? urlKey,
    body: raw.bodyHtml ?? "",
    pros: raw.pros,
    cons: raw.cons,
    date: raw.publishedAt
  };
  const article = normalizePost(post, "seed-url");
  const issues = sanityCheckArticle(article).filter((i) => !i.includes("bodyMarkdown"));
  const stats = `pros=${article.pros.length}, cons=${article.cons.length}`;
  if (issues.length) {
    console.log(`FAIL [${issues.join("; ")}] (${stats})`);
    return false;
  }
  if (isAbsurdProsCons(article.pros) || isAbsurdProsCons(article.cons)) {
    console.log(`FAIL [absurd pros/cons po normalizacji] (${stats})`);
    return false;
  }
  console.log(`OK (${stats})`);
  return true;
}

async function main(): Promise<void> {
  let failed = 0;

  console.log("Offline fixtures (parser pros/cons):");
  for (const urlKey of OFFLINE_FIXTURES) {
    process.stdout.write(`${urlKey}… `);
    try {
      if (!(await checkOfflineFixture(urlKey))) failed++;
    } catch (err) {
      failed++;
      console.log(`ERROR ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\nAPI/cache examples:");
  for (const urlKey of EXAMPLES) {
    process.stdout.write(`${urlKey}… `);
    try {
      const post = await fetchPostByUrlKey(urlKey, { cacheDir: CACHE_DIR });
      const article = normalizePost(post, "seed-url");
      const issues = sanityCheckArticle(article);
      const stats = [
        `title=${article.title.length}c`,
        `md=${article.bodyMarkdown.length}c`,
        `h=${article.headings.length}`,
        `pros=${article.pros.length}`,
        `cons=${article.cons.length}`,
        `yt=${article.youtube.length}`,
        `img=${article.images.gallery.length + article.images.inline.length}`
      ].join(", ");
      if (issues.length) {
        failed++;
        console.log(`FAIL [${issues.join("; ")}] (${stats})`);
      } else {
        console.log(`OK (${stats})`);
      }
    } catch (err) {
      failed++;
      console.log(`ERROR ${err instanceof Error ? err.message : err}`);
    }
  }
  if (failed) {
    process.exitCode = 1;
    console.error(`\n${failed} przykładów nie przeszło sanity-check.`);
  } else {
    console.log(`\nWszystkie przykłady OK (${OFFLINE_FIXTURES.length} offline + ${EXAMPLES.length} cache/API).`);
  }
}

main();
