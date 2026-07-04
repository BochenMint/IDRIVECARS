#!/usr/bin/env npx tsx
/**
 * Przygotowuje zadania AI dla rekordów ze statusem needs-ai-draft.
 * Zapisuje pliki JSON w data/news/ai-jobs/ + prompty .txt dla lokalnego modelu.
 * Uruchom: npm run news:ai-prepare
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  buildAiDraftInput,
  buildAiJobFile,
  formatPromptForLocalModelWithStyle
} from "../../src/lib/news/ai-contract";
import { listRecordsByStatus, NEWS_AI_DIR, ensureNewsDirs } from "../../src/lib/news/store";

async function main() {
  await ensureNewsDirs();
  const pending = await listRecordsByStatus("needs-ai-draft");
  if (!pending.length) {
    console.log("Brak rekordów needs-ai-draft.");
    return;
  }

  let created = 0;
  for (const raw of pending) {
    const jobId = `job-${raw.id}`;
    const jobPath = path.join(NEWS_AI_DIR, `${jobId}.json`);
    const promptPath = path.join(NEWS_AI_DIR, `${jobId}.prompt.txt`);

    try {
      await fs.access(jobPath);
      continue;
    } catch {
      // nowe zadanie
    }

    const input = buildAiDraftInput(raw, jobId);
    const job = buildAiJobFile(input);
    await fs.writeFile(jobPath, JSON.stringify(job, null, 2), "utf8");
    await fs.writeFile(promptPath, await formatPromptForLocalModelWithStyle(job), "utf8");
    created++;
    console.log("Utworzono:", jobId);
  }

  console.log(`Gotowe. Nowych zadań AI: ${created}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
