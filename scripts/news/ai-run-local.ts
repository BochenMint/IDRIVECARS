#!/usr/bin/env npx tsx
/**
 * Wysyła wygenerowany prompt do lokalnego modelu (Ollama albo LM Studio/OpenAI-compatible).
 *
 * Env:
 * - LOCAL_AI_BASE_URL=http://localhost:11434        # Ollama
 * - LOCAL_AI_BASE_URL=http://localhost:1234/v1     # LM Studio / OpenAI-compatible
 * - LOCAL_AI_MODEL=llama3.2
 * - LOCAL_AI_PROVIDER=ollama|openai                # opcjonalnie, auto-detect po URL
 *
 * Uruchom:
 * npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json --dry-run
 * npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json
 * npm run news:ai-run-local -- data/news/ai-jobs/job-xxx.json --apply
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import type { AiDraftOutput, AiJobFile } from "../../src/lib/news/types";
import { formatPromptForLocalModel, validateAiDraftOutput } from "../../src/lib/news/ai-contract";
import { NEWS_AI_DIR } from "../../src/lib/news/store";

type Args = {
  jobPath?: string;
  outputPath?: string;
  dryRun: boolean;
  apply: boolean;
};

type OpenAiResponse = {
  choices?: Array<{ message?: { content?: string }; text?: string }>;
};

type OllamaResponse = {
  response?: string;
  message?: { content?: string };
};

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, apply: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--apply") args.apply = true;
    else if (arg === "--output") args.outputPath = argv[++i];
    else if (!args.jobPath) args.jobPath = arg;
  }
  return args;
}

async function resolveJobPath(input?: string): Promise<string> {
  if (input) {
    if (input.endsWith(".prompt.txt")) return input.replace(/\.prompt\.txt$/, ".json");
    return input;
  }

  const files = await fs.readdir(NEWS_AI_DIR).catch(() => []);
  for (const file of files) {
    if (!file.endsWith(".json") || file.endsWith(".output.json")) continue;
    const candidate = path.join(NEWS_AI_DIR, file);
    const job = JSON.parse(await fs.readFile(candidate, "utf8")) as AiJobFile;
    if (job.status === "pending") return candidate;
  }

  throw new Error("Brak ścieżki job i brak pending job w data/news/ai-jobs.");
}

async function readJob(jobPath: string): Promise<{ job: AiJobFile; prompt: string }> {
  if (!existsSync(jobPath)) throw new Error(`Brak pliku job: ${jobPath}`);
  const job = JSON.parse(await fs.readFile(jobPath, "utf8")) as AiJobFile;
  const promptPath = jobPath.replace(/\.json$/, ".prompt.txt");
  const prompt = existsSync(promptPath)
    ? await fs.readFile(promptPath, "utf8")
    : formatPromptForLocalModel(job);
  return { job, prompt };
}

function providerFor(baseUrl: string): "ollama" | "openai" {
  const explicit = process.env.LOCAL_AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "ollama" || explicit === "openai") return explicit;
  if (baseUrl.includes("11434") || baseUrl.endsWith("/api/generate")) return "ollama";
  return "openai";
}

function joinUrl(baseUrl: string, suffix: string): string {
  return `${baseUrl.replace(/\/$/, "")}${suffix}`;
}

async function callLocalModel(prompt: string): Promise<string> {
  const baseUrl = process.env.LOCAL_AI_BASE_URL?.trim() || "http://localhost:11434";
  const model = process.env.LOCAL_AI_MODEL?.trim();
  if (!model) throw new Error("Ustaw LOCAL_AI_MODEL, np. llama3.2 albo nazwę modelu w LM Studio.");

  const provider = providerFor(baseUrl);
  if (provider === "ollama") {
    const endpoint = baseUrl.endsWith("/api/generate") ? baseUrl : joinUrl(baseUrl, "/api/generate");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
      signal: AbortSignal.timeout(180_000)
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as OllamaResponse;
    return data.response ?? data.message?.content ?? "";
  }

  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : baseUrl.endsWith("/v1")
      ? joinUrl(baseUrl, "/chat/completions")
      : joinUrl(baseUrl, "/v1/chat/completions");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    }),
    signal: AbortSignal.timeout(180_000)
  });
  if (!res.ok) throw new Error(`Local AI HTTP ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as OpenAiResponse;
  return data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? "";
}

function parseJsonOutput(raw: string): AiDraftOutput {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model nie zwrócił obiektu JSON.");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as AiDraftOutput;
}

async function applyOutput(outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "scripts/news/ai-apply.ts", outputPath], {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ai-apply zakończony kodem ${code}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const jobPath = await resolveJobPath(args.jobPath);
  const { job, prompt } = await readJob(jobPath);
  const outputPath =
    args.outputPath ?? path.join(path.dirname(jobPath), `${job.input.jobId}.output.json`);

  if (args.dryRun) {
    console.log("Dry-run local AI");
    console.log("Job:", jobPath);
    console.log("Output:", outputPath);
    console.log("Provider:", providerFor(process.env.LOCAL_AI_BASE_URL?.trim() || "http://localhost:11434"));
    console.log("Model:", process.env.LOCAL_AI_MODEL ?? "(brak LOCAL_AI_MODEL)");
    console.log("Prompt chars:", prompt.length);
    return;
  }

  const rawResponse = await callLocalModel(prompt);
  const output = parseJsonOutput(rawResponse);
  const validation = validateAiDraftOutput(job.input, output);
  if (!validation.ok) {
    throw new Error(`Niepoprawne wyjście AI: ${validation.errors.join("; ")}`);
  }

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");
  console.log("Zapisano output AI:", outputPath);

  if (args.apply) {
    await applyOutput(outputPath);
  } else {
    console.log("Następny krok: npm run news:ai-apply --", outputPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
