#!/usr/bin/env npx tsx
/**
 * Buduje korpus stylu Marcina Bochenka z importu autoGALERIA
 * oraz profil JSON + MD dla lokalnego modelu AI.
 *
 * Uruchom: npm run style:build
 */

import fs from "node:fs/promises";
import {
  analyzeCorpus,
  buildCorpusFromImport,
  profileToMarkdown,
  writeCorpusJsonl
} from "../../src/lib/style";
import { CORPUS_JSONL, PROFILE_JSON, PROFILE_MD, SHINGLES_JSON, STYLE_DIR } from "../../src/lib/style/paths";

async function main() {
  console.log("Budowanie korpusu stylu Marcina Bochenka…");

  const entries = await buildCorpusFromImport();
  if (entries.length < 50) {
    console.warn(`UWAGA: tylko ${entries.length} artykułów w korpusie (oczekiwano ~75)`);
  }

  await writeCorpusJsonl(entries, CORPUS_JSONL);
  console.log(`Korpus JSONL: ${entries.length} wpisów → ${CORPUS_JSONL}`);

  const { profile, shingles } = analyzeCorpus(entries);

  await fs.mkdir(STYLE_DIR, { recursive: true });
  await fs.writeFile(PROFILE_JSON, JSON.stringify(profile, null, 2), "utf8");
  await fs.writeFile(PROFILE_MD, profileToMarkdown(profile), "utf8");
  await fs.writeFile(SHINGLES_JSON, JSON.stringify(shingles), "utf8");

  console.log(`Profil JSON → ${PROFILE_JSON}`);
  console.log(`Profil MD   → ${PROFILE_MD}`);
  console.log(`Shingles    → ${shingles.length} (anty-plagiat)`);
  console.log("\nStatystyki:");
  console.log(`  Artykuły: ${profile.corpusStats.articleCount}`);
  console.log(`  Rodzaje:`, profile.corpusStats.byKind);
  console.log(`  Śr. lead: ${profile.corpusStats.avgLeadWords} słów`);
  console.log(`  Śr. body: ${profile.corpusStats.avgBodyWords} słów`);
  console.log("\nGotowe. Uruchom: npm run style:check");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
