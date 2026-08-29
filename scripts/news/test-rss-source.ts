#!/usr/bin/env npx tsx
/**
 * Test źródła RSS — live + fixture offline (wyłącznie oficjalne press roomy).
 * Uruchom: npm run news:test-rss
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fetchFromRss } from "../../src/lib/news/adapters/rss";
import type { NewsSourceConfig } from "../../src/lib/news/types";

const FIXTURE = path.join(process.cwd(), "data/news/fixtures/official-press-rss.xml");
const HTML_SNIPPET = path.join(process.cwd(), "data/news/fixtures/pressroom-html-snippet.txt");

/** Oficjalne źródła RSS do testów live (bez agregatorów). */
const SOURCES: Record<string, NewsSourceConfig> = {
  "toyota-pressroom-rss": {
    id: "toyota-pressroom-rss",
    name: "Toyota USA Pressroom RSS",
    brands: ["Toyota", "Lexus"],
    region: "US",
    sourceType: "rss",
    fetchUrl: "https://pressroom.toyota.com/feed/",
    pressUrl: "https://pressroom.toyota.com/",
    loginRequired: false,
    enabled: true
  },
  "toyota-global-rss": {
    id: "toyota-global-rss",
    name: "Toyota Motor Corporation Global RSS",
    brands: ["Toyota"],
    region: "JP",
    sourceType: "rss",
    fetchUrl: "https://global.toyota/export/en/allnews_rss.xml",
    pressUrl: "https://global.toyota/en/newsroom/",
    loginRequired: false,
    enabled: true
  }
};

const DEFAULT_LIVE_IDS = ["toyota-pressroom-rss", "toyota-global-rss"];

let failures = 0;

function fail(msg: string) {
  console.error("FAIL:", msg);
  failures++;
}

function ok(msg: string) {
  console.log("OK:", msg);
}

async function testFixture() {
  const Parser = (await import("rss-parser")).default;
  const parser = new Parser();
  const xml = await fs.readFile(FIXTURE, "utf8");
  const feed = await parser.parseString(xml);
  if ((feed.items?.length ?? 0) < 2) {
    fail(`Fixture: za mało itemów (${feed.items?.length ?? 0})`);
  } else {
    ok(`Fixture: ${feed.items!.length} itemów (official-press-rss.xml)`);
  }

  const html = await fs.readFile(HTML_SNIPPET, "utf8");
  const looksLikeRss =
    html.trimStart().startsWith("<?xml") || /<rss[\s>]/i.test(html);
  if (looksLikeRss) fail("HTML snippet fixture nie powinien wyglądać jak RSS");
  else ok("HTML snippet fixture rozpoznawalny jako nie-RSS");
}

async function testLive(id: string) {
  const source = SOURCES[id];
  if (!source) {
    fail(`Nieznane źródło: ${id}`);
    return;
  }
  try {
    const items = await fetchFromRss(source);
    if (!items.length) fail(`${id}: 0 itemów`);
    else ok(`${id}: ${items.length} itemów (np. „${items[0]?.title?.slice(0, 50)}…")`);
  } catch (e) {
    fail(`${id}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main() {
  const mode = process.argv[2];

  if (mode === "fixture") {
    await testFixture();
    return finish();
  }

  if (mode === "live") {
    for (const id of DEFAULT_LIVE_IDS) await testLive(id);
    return finish();
  }

  if (mode && SOURCES[mode]) {
    await testLive(mode);
    return finish();
  }

  await testFixture();
  for (const id of DEFAULT_LIVE_IDS) await testLive(id);
  finish();
}

function finish() {
  if (failures) {
    console.error(`\nnews:test-rss — ${failures} błędów`);
    process.exitCode = 1;
  } else {
    console.log("\nnews:test-rss — OK");
  }
}

main();
