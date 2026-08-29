#!/usr/bin/env npx tsx
/**
 * Codzienny skan źródeł news — RSS, publiczne newsroomy HTML.
 * Uruchom: npm run news:scan
 * Opcje env: NEWS_SCAN_DRY_RUN=1, NEWS_DOWNLOAD_IMAGES=1, NEWS_SOURCE_IDS=bmw-press-rss,porsche-newsroom-rss
 */

import { runNewsScan } from "../../src/lib/news/scan";

async function main() {
  const dryRun = process.env.NEWS_SCAN_DRY_RUN === "1";
  const downloadImages = process.env.NEWS_DOWNLOAD_IMAGES === "1";
  const sourceIds = process.env.NEWS_SOURCE_IDS?.split(",").map((s) => s.trim()).filter(Boolean);

  console.log("IDRIVECARS news scan — start");
  const report = await runNewsScan({
    dryRun,
    downloadImages,
    sourceIds,
    autoQueueAi: true
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) {
    console.warn(`Błędy (${report.errors.length}):`);
    for (const e of report.errors) console.warn(`  [${e.sourceId}] ${e.message}`);
  }
  console.log(
    `Gotowe: ${report.itemsSaved} nowych, ${report.itemsSkipped} pominiętych (duplikat), ${report.aiQueued} w kolejce AI`
  );

  if (report.errors.length && report.itemsSaved === 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
