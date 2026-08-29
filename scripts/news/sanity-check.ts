#!/usr/bin/env npx tsx
/**
 * Sanity check modułu news — walidacja katalogu, typów, adapterów.
 * Uruchom: npm run news:sanity
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { loadAllNewsSources, getCatalogPath } from "../../src/lib/news/catalog";
import { hashContent, toSlug } from "../../src/lib/news/hash";
import type { NewsSourceConfig, SourceType } from "../../src/lib/news/types";

const VALID_SOURCE_TYPES: SourceType[] = [
  "rss",
  "newsroom_html",
  "api",
  "media_kit",
  "requires_login",
  "external_media"
];

const REQUIRED_REGIONS = ["EU", "US", "JP", "KR", "CN"] as const;

/** Domeny portali redakcyjnych / agregatorów — niedozwolone w aktywnym katalogu. */
const BLOCKED_AGGREGATOR_PATTERNS: RegExp[] = [
  /autocentrum\.pl/i,
  /motorsport\.com/i,
  /autoblog\./i,
  /motor1\.com/i,
  /topgear\.com/i,
  /carscoops\.com/i,
  /autonews\.com/i,
  /feedspot\.com/i
];

const BLOCKED_SOURCE_IDS = new Set(["autocentrum-rss", "motorsport-pl-rss"]);

/** Kluczowe marki — raport pokrycia (brak = WARN, nie FAIL). */
const KEY_BRANDS: string[] = [
  "Volkswagen",
  "Škoda",
  "SEAT",
  "CUPRA",
  "Audi",
  "Porsche",
  "Bentley",
  "Lamborghini",
  "Bugatti",
  "BMW",
  "MINI",
  "Rolls-Royce",
  "Mercedes-Benz",
  "smart",
  "Peugeot",
  "Citroën",
  "Opel",
  "Fiat",
  "Jeep",
  "Alfa Romeo",
  "Maserati",
  "Renault",
  "Dacia",
  "Alpine",
  "Toyota",
  "Lexus",
  "Honda",
  "Nissan",
  "Hyundai",
  "Kia",
  "Genesis",
  "Ford",
  "Chevrolet",
  "Tesla",
  "Volvo",
  "Polestar",
  "BYD",
  "Ferrari",
  "McLaren",
  "Aston Martin"
];

let failures = 0;
let warnings = 0;

function fail(msg: string) {
  console.error("FAIL:", msg);
  failures++;
}

function warn(msg: string) {
  console.warn("WARN:", msg);
  warnings++;
}

function ok(msg: string) {
  console.log("OK:", msg);
}

function isAggregatorSource(s: NewsSourceConfig): boolean {
  if (BLOCKED_SOURCE_IDS.has(s.id)) return true;
  if (s.sourceType === "external_media") return true;
  const haystack = `${s.id} ${s.name} ${s.fetchUrl} ${s.pressUrl ?? ""}`;
  return BLOCKED_AGGREGATOR_PATTERNS.some((re) => re.test(haystack));
}

function validateSource(s: NewsSourceConfig, index: number) {
  if (!s.id) fail(`Źródło #${index}: brak id`);
  if (!s.name) fail(`Źródło ${s.id}: brak name`);
  if (!s.fetchUrl) fail(`Źródło ${s.id}: brak fetchUrl`);
  if (!VALID_SOURCE_TYPES.includes(s.sourceType)) {
    fail(`Źródło ${s.id}: nieznany sourceType ${s.sourceType}`);
  }
  if (!s.brands?.length) fail(`Źródło ${s.id}: brak brands`);

  if (isAggregatorSource(s)) {
    if (s.enabled) {
      fail(
        `Źródło ${s.id}: agregator/portal redakcyjny nie może być enabled (official-only policy)`
      );
    } else {
      warn(`Źródło ${s.id}: wykryto agregator — usuń z katalogu lub trzymaj disabled`);
    }
  }

  if (s.enabled && s.sourceType === "external_media") {
    fail(`Źródło ${s.id}: external_media nie może być włączone`);
  }
}

function reportBrandCoverage(sources: NewsSourceConfig[]) {
  const covered = new Set<string>();
  for (const s of sources) {
    for (const b of s.brands) covered.add(b);
  }

  const missing: string[] = [];
  for (const brand of KEY_BRANDS) {
    if (!covered.has(brand)) missing.push(brand);
  }

  const pct = Math.round(((KEY_BRANDS.length - missing.length) / KEY_BRANDS.length) * 100);
  ok(
    `Pokrycie kluczowych marek: ${KEY_BRANDS.length - missing.length}/${KEY_BRANDS.length} (${pct}%)`
  );

  if (missing.length) {
    warn(`Brak w seedzie (kluczowe marki): ${missing.join(", ")}`);
  }

  const enabledOfficial = sources.filter((s) => s.enabled && !isAggregatorSource(s));
  const enabledBrands = new Set(enabledOfficial.flatMap((s) => s.brands));
  ok(
    `Marki z aktywnym skanem: ${[...enabledBrands].sort().join(", ") || "(brak)"}`
  );
}

async function main() {
  const catalogPath = getCatalogPath();
  if (!existsSync(catalogPath)) {
    fail("Brak content/news-catalog/sources.json");
  } else {
    ok("Katalog sources.json istnieje");
  }

  const sources = await loadAllNewsSources();
  if (sources.length < 50) {
    fail(`Za mało źródeł seed (${sources.length}) — oczekiwano >= 50 oficjalnych press roomów`);
  } else {
    ok(`${sources.length} źródeł w katalogu`);
  }

  const enabledCount = sources.filter((s) => s.enabled).length;
  const disabledCount = sources.length - enabledCount;
  ok(`Aktywne: ${enabledCount}, wyłączone: ${disabledCount}`);

  const ids = new Set<string>();
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    validateSource(s, i);
    if (ids.has(s.id)) fail(`Duplikat id: ${s.id}`);
    ids.add(s.id);
  }

  const aggregatorsInCatalog = sources.filter(isAggregatorSource);
  if (aggregatorsInCatalog.length) {
    fail(
      `Katalog zawiera ${aggregatorsInCatalog.length} wpis(ów) agregatorów: ${aggregatorsInCatalog.map((s) => s.id).join(", ")} — usuń je`
    );
  } else {
    ok("Brak agregatorów w katalogu (official-only)");
  }

  reportBrandCoverage(sources);

  for (const region of REQUIRED_REGIONS) {
    const count = sources.filter(
      (s) => s.region === region || (region === "EU" && s.region === "global")
    ).length;
    if (count < 3) fail(`Za mało źródeł dla regionu ${region}: ${count}`);
    else ok(`Region ${region}: ${count} źródeł`);
  }

  const enabledRss = sources.filter(
    (s) => s.enabled && s.sourceType === "rss" && !isAggregatorSource(s)
  );
  if (enabledRss.length < 2) {
    fail("Włącz minimum 2 oficjalne źródła RSS do auto-skanu");
  } else {
    ok(`${enabledRss.length} włączonych oficjalnych źródeł RSS: ${enabledRss.map((s) => s.id).join(", ")}`);
  }

  const hash1 = hashContent({
    sourceUrl: "https://example.com/a",
    title: "Test",
    publishedAt: "2026-01-01"
  });
  const hash2 = hashContent({
    sourceUrl: "https://example.com/a",
    title: "Test",
    publishedAt: "2026-01-01"
  });
  if (hash1 !== hash2) fail("Hash deduplikacji niestabilny");
  else ok("Hash deduplikacji stabilny");

  const slug = toSlug("BMW prezentuje nowy model!", "2026-06-30T12:00:00Z");
  if (!slug.startsWith("20260630-")) fail(`Niepoprawny slug: ${slug}`);
  else ok(`Slug: ${slug}`);

  const libFiles = [
    "src/lib/news/types.ts",
    "src/lib/news/catalog.ts",
    "src/lib/news/store.ts",
    "src/lib/news/pipeline.ts",
    "src/lib/news/review.ts",
    "src/lib/news/scan.ts",
    "src/lib/news/ai-contract.ts",
    "src/lib/news/seo.ts",
    "src/lib/news/adapters/index.ts"
  ];
  for (const f of libFiles) {
    if (!existsSync(path.join(process.cwd(), f))) fail(`Brak pliku: ${f}`);
  }
  ok("Pliki biblioteki news na miejscu");

  const scripts = [
    "scripts/news/scan.ts",
    "scripts/news/ai-prepare.ts",
    "scripts/news/ai-run-local.ts",
    "scripts/news/ai-apply.ts",
    "scripts/news/fact-check.ts"
  ];
  for (const f of scripts) {
    if (!existsSync(path.join(process.cwd(), f))) fail(`Brak skryptu: ${f}`);
  }
  ok("Skrypty operacyjne na miejscu");

  if (!existsSync(path.join(process.cwd(), "src/lib/news/fact-check.ts"))) {
    fail("Brak modułu fact-check");
  } else ok("Moduł fact-check na miejscu");

  const adminFiles = [
    "src/app/admin/news/review/page.tsx",
    "src/app/admin/news/review/NewsReviewActions.tsx",
    "src/app/api/admin/news/scan/route.ts",
    "src/app/api/admin/news/status/route.ts"
  ];
  for (const f of adminFiles) {
    if (!existsSync(path.join(process.cwd(), f))) fail(`Brak pliku admin/API: ${f}`);
  }
  ok("Panel review i API na miejscu");

  if (failures) {
    console.error(`\nSanity check: ${failures} błędów, ${warnings} ostrzeżeń`);
    process.exitCode = 1;
  } else {
    console.log(`\nSanity check: wszystko OK (${warnings} ostrzeżeń)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
