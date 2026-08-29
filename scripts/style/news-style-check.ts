#!/usr/bin/env npx tsx
/**
 * Walidacja stylu wygenerowanego newsa (guardrails anty-PR / anty-plagiat).
 *
 * Uruchom:
 *   npm run news:style-check -- data/news/ai-jobs/job-xxx.output.json
 *   npm run news:style-check -- content/news/slug.mdx
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { AiDraftOutput } from "../../src/lib/news/types";
import { loadCorpusShingles, validateStyleGuardrails } from "../../src/lib/style";
import { SHINGLES_JSON } from "../../src/lib/style/paths";

async function loadInput(filePath: string) {
  const abs = path.resolve(filePath);
  const raw = await fs.readFile(abs, "utf8");

  if (abs.endsWith(".json")) {
    const data = JSON.parse(raw) as AiDraftOutput & { sourceUrl?: string; sourceName?: string };
    return {
      title: data.title,
      lead: data.lead,
      bodyMarkdown: data.bodyMarkdown,
      sourceUrl: data.sourceUrl,
      sourceName: data.sourceName
    };
  }

  if (abs.endsWith(".mdx") || abs.endsWith(".md")) {
    const { data, content } = matter(raw);
    return {
      title: String(data.title ?? ""),
      lead: String(data.lead ?? ""),
      bodyMarkdown: content,
      sourceUrl: data.sourceUrl ? String(data.sourceUrl) : undefined,
      sourceName: data.sourceName ? String(data.sourceName) : undefined
    };
  }

  throw new Error("Obsługiwane formaty: .json (output AI), .mdx, .md");
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Użycie: npm run news:style-check -- <plik.json|mdx>");
    process.exitCode = 1;
    return;
  }

  if (!existsSync(SHINGLES_JSON)) {
    console.error("Brak shingles — uruchom: npm run style:build");
    process.exitCode = 1;
    return;
  }

  const input = await loadInput(inputPath);
  const shingles = await loadCorpusShingles(SHINGLES_JSON);
  const result = validateStyleGuardrails(input, { corpusShingles: shingles });

  for (const c of result.checks) {
    const icon = c.ok ? "✓" : c.severity === "error" ? "✗" : "!";
    console.log(`${icon} [${c.id}] ${c.message}`);
  }

  console.log(`\nWynik: ${result.ok ? "PASS" : "FAIL"} (score ${result.score})`);

  if (!result.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
