#!/usr/bin/env npx tsx
/**
 * Fact-check outputu AI vs materiał źródłowy (raw RSS).
 * Uruchom: npm run news:fact-check -- data/news/ai-jobs/job-xxx.output.json
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AiDraftOutput, AiJobFile } from "../../src/lib/news/types";
import { loadRawRecord, NEWS_AI_DIR } from "../../src/lib/news/store";
import { validateAiFactCheck, formatFactCheckReport } from "../../src/lib/news/fact-check";

function buildSourceText(raw: {
  title: string;
  lead?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
}): string {
  return [raw.title, raw.lead ?? "", raw.bodyText ?? "", raw.bodyHtml ?? ""].filter(Boolean).join("\n");
}

async function main() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    console.error("Użycie: npm run news:fact-check -- <ścieżka-do-output.json>");
    process.exitCode = 1;
    return;
  }

  const output: AiDraftOutput = JSON.parse(await fs.readFile(outputPath, "utf8"));
  const jobPath = path.join(NEWS_AI_DIR, `${output.jobId}.json`);
  if (!existsSync(jobPath)) {
    console.error("Brak pliku job:", jobPath);
    process.exitCode = 1;
    return;
  }

  const job = JSON.parse(await fs.readFile(jobPath, "utf8")) as AiJobFile;
  const raw = await loadRawRecord(job.input.raw.storagePath);
  if (!raw) {
    console.error("Brak rekordu raw:", job.input.raw.id);
    process.exitCode = 1;
    return;
  }

  const sourceText = buildSourceText(raw);
  const result = validateAiFactCheck({
    sourceText,
    output,
    publishedAt: raw.publishedAt
  });

  console.log(formatFactCheckReport(result));
  if (!result.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
