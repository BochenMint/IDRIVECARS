#!/usr/bin/env npx tsx
/**
 * Stosuje wynik lokalnego modelu AI (JSON) i zapisuje szkic MDX ze statusem draft/review.
 * Uruchom: npm run news:ai-apply -- data/news/ai-jobs/job-xxx.output.json
 *
 * Autopublish jest WYŁĄCZONY — tylko draft lub review.
 * Przed zapisem: style guardrails + fact-check (liczby/datę vs raw RSS).
 * Dev: --skip-fact-check
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AiDraftOutput, AiJobFile } from "../../src/lib/news/types";
import {
  resolveStatusAfterAi,
  suggestSlug,
  validateAiDraftOutput
} from "../../src/lib/news/ai-contract";
import { loadRawRecord, NEWS_AI_DIR } from "../../src/lib/news/store";
import { updateRecordStatus } from "../../src/lib/news/pipeline";
import { loadCorpusShingles, validateStyleGuardrails } from "../../src/lib/style";
import { SHINGLES_JSON } from "../../src/lib/style/paths";
import { validateAiFactCheck, formatFactCheckReport } from "../../src/lib/news/fact-check";

const SKIP_FACT_CHECK = process.argv.includes("--skip-fact-check");

const NEWS_DIR = path.join(process.cwd(), "content", "news");

function escapeYaml(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function main() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    console.error("Użycie: npm run news:ai-apply -- <ścieżka-do-output.json>");
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
  const validation = validateAiDraftOutput(job.input, output);
  if (!validation.ok) {
    console.error("Niepoprawne wyjście AI:", validation.errors.join("; "));
    process.exitCode = 1;
    return;
  }

  if (existsSync(SHINGLES_JSON)) {
    const shingles = await loadCorpusShingles(SHINGLES_JSON);
    const styleCheck = validateStyleGuardrails(
      {
        title: output.title,
        lead: output.lead,
        bodyMarkdown: output.bodyMarkdown,
        sourceUrl: job.input.raw.sourceUrl,
        sourceName: job.input.raw.sourceName
      },
      { corpusShingles: shingles }
    );
    for (const c of styleCheck.checks.filter((x) => !x.ok)) {
      console.warn(`[style:${c.severity}] ${c.message}`);
    }
    if (!styleCheck.ok) {
      console.error("Style guardrail FAIL — popraw tekst lub uruchom: npm run news:style-check");
      process.exitCode = 1;
      return;
    }
    console.log(`Style guardrail OK (score ${styleCheck.score})`);
  } else {
    console.warn("Brak profilu stylu — uruchom: npm run style:build");
  }

  const raw = await loadRawRecord(job.input.raw.storagePath);
  if (!raw) {
    console.error("Brak rekordu raw:", job.input.raw.id);
    process.exitCode = 1;
    return;
  }

  if (!SKIP_FACT_CHECK) {
    const sourceText = [raw.title, raw.lead ?? "", raw.bodyText ?? "", raw.bodyHtml ?? ""]
      .filter(Boolean)
      .join("\n");
    const factCheck = validateAiFactCheck({
      sourceText,
      output,
      publishedAt: raw.publishedAt
    });
    console.log(formatFactCheckReport(factCheck));
    if (!factCheck.ok) {
      console.error(
        "Fact-check FAIL — nieuprawnione liczby/datę w outputcie AI. Popraw tekst lub uruchom: npm run news:fact-check"
      );
      process.exitCode = 1;
      return;
    }
  }

  const status = resolveStatusAfterAi(output);
  const slug = suggestSlug(output, raw.publishedAt);
  const mdxPath = path.join(NEWS_DIR, `${slug}.mdx`);

  if (existsSync(mdxPath)) {
    console.error("MDX już istnieje:", slug);
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(NEWS_DIR, { recursive: true });

  const imageLine = raw.images.find((i) => i.localPath)?.localPath
    ? `image: ${escapeYaml(`/news/${raw.images.find((i) => i.localPath)!.localPath!.replace(/^images\//, "")}`)}`
    : raw.images[0]?.url
      ? `image: ${escapeYaml(raw.images[0].url)}`
      : null;

  const frontmatter = [
    `title: ${escapeYaml(output.title)}`,
    `lead: ${escapeYaml(output.lead)}`,
    `sourceUrl: ${escapeYaml(raw.sourceUrl)}`,
    `sourceName: ${escapeYaml(raw.sourceName)}`,
    `publishedAt: "${raw.publishedAt}"`,
    `status: "${status}"`,
    `sourceType: "${raw.sourceType === "rss" ? "rss" : "press_portal"}"`,
    raw.manufacturerId ? `manufacturerId: "${raw.manufacturerId}"` : null,
    `seoTitle: ${escapeYaml(output.seo.metaTitle)}`,
    `seoDescription: ${escapeYaml(output.seo.metaDescription)}`,
    `tags: [${output.tags.map((t) => escapeYaml(t)).join(", ")}]`,
    imageLine
  ]
    .filter(Boolean)
    .join("\n");

  const licenseBlock = output.licenseWarnings.map((w) => `> ${w}`).join("\n");
  const body = `${output.bodyMarkdown}\n\n---\n\n${licenseBlock}\n\nŹródło: [${raw.sourceName}](${raw.sourceUrl})`;

  await fs.writeFile(mdxPath, `---\n${frontmatter}\n---\n\n${body}\n`, "utf8");

  job.output = output;
  job.status = "completed";
  await fs.writeFile(jobPath, JSON.stringify(job, null, 2), "utf8");
  await updateRecordStatus(raw.id, status === "review" ? "review" : "draft");

  console.log(`Zapisano szkic: ${slug} (status: ${status})`);
  console.log("Review w panelu /admin/news przed publikacją.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
