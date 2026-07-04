import type { MarcinStyleProfile, StyleGuardrailInput, StyleGuardrailResult } from "./types";
import { buildShingles, normalizeText, splitSentences, wordCount } from "./text-utils";

const PR_PHRASES = [
  "z radoscią informujemy",
  "z przyjemnoscia informujemy",
  "rewolucyjny",
  "przelomowy",
  "lider segmentu",
  "lider rynku",
  "innowacyjne rozwiazanie",
  "innowacyjne rozwiązanie",
  "najwyzsza jakosc",
  "najwyższa jakość",
  "bez precedensu",
  "game changer",
  "next level",
  "premium experience",
  "world class",
  "niezwykle sie cieszymy",
  "niezwykle się cieszymy",
  "jestesmy dumni",
  "jesteśmy dumni"
];

import { checkPolishLanguage } from "./polish-language";

const CLICKBAIT = [/nie uwierzysz/i, /\bszok\b/i, /zobacz co/i, /musisz to zobaczyc/i, /musisz to zobaczyć/i];

export type GuardrailOptions = {
  corpusShingles?: Set<string>;
  profile?: MarcinStyleProfile;
  /** Min. overlap 5-gramów uznawany za plagiat (0–1). */
  plagiarismThreshold?: number;
};

function checkPolish(text: string): { ok: boolean; ratio: number; enRatio?: number; detail?: string } {
  const r = checkPolishLanguage(text);
  return {
    ok: r.ok,
    ratio: r.ratio,
    enRatio: r.enRatio,
    detail: r.reason
  };
}

function checkPlagiarism(
  text: string,
  corpusShingles: Set<string>,
  threshold: number
): { ok: boolean; maxOverlap: number } {
  if (!corpusShingles.size) return { ok: true, maxOverlap: 0 };
  const shingles = buildShingles(text, 5);
  if (!shingles.size) return { ok: true, maxOverlap: 0 };
  let overlap = 0;
  for (const sh of shingles) {
    if (corpusShingles.has(sh)) overlap++;
  }
  const ratio = overlap / shingles.size;
  return { ok: ratio < threshold, maxOverlap: ratio };
}

function checkConcreteDetails(text: string): boolean {
  const hasNumber = /\d/.test(text);
  const hasProper = /[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,}/.test(text);
  return hasNumber || hasProper;
}

function checkSourceMention(input: StyleGuardrailInput): boolean {
  if (!input.sourceUrl && !input.sourceName) return true;
  const body = `${input.lead} ${input.bodyMarkdown}`.toLowerCase();
  if (input.sourceName && body.includes(input.sourceName.toLowerCase())) return true;
  if (input.sourceUrl) {
    const host = input.sourceUrl.replace(/^https?:\/\//, "").split("/")[0];
    if (body.includes(host.toLowerCase())) return true;
  }
  return /źródło|zrodlo|wg\s|według|donosi|komunikat/i.test(body);
}

function checkAntiPr(text: string): { ok: boolean; hits: string[] } {
  const norm = normalizeText(text);
  const hits = PR_PHRASES.filter((p) => norm.includes(normalizeText(p)));
  return { ok: hits.length <= 1, hits };
}

export function validateStyleGuardrails(
  input: StyleGuardrailInput,
  options: GuardrailOptions = {}
): StyleGuardrailResult {
  const checks: StyleGuardrailResult["checks"] = [];
  const fullText = `${input.title}\n${input.lead}\n${input.bodyMarkdown}`;
  const threshold = options.plagiarismThreshold ?? 0.08;

  const leadWords = wordCount(input.lead);
  checks.push({
    id: "lead-present",
    ok: leadWords >= 12,
    severity: "error",
    message:
      leadWords >= 12
        ? `Lead OK (${leadWords} słów)`
        : `Lead za krótki (${leadWords} słów, min. 12)`
  });

  const pl = checkPolish(fullText);
  checks.push({
    id: "polish-language",
    ok: pl.ok,
    severity: "error",
    message: pl.ok
      ? `Język polski OK (marker ratio ${(pl.ratio * 100).toFixed(1)}%, EN noise ${((pl.enRatio ?? 0) * 100).toFixed(1)}%)`
      : pl.detail ??
        `Tekst nie wygląda na polski (marker ratio ${(pl.ratio * 100).toFixed(1)}%)`
  });

  if (options.corpusShingles) {
    const plag = checkPlagiarism(fullText, options.corpusShingles, threshold);
    checks.push({
      id: "anti-plagiarism",
      ok: plag.ok,
      severity: "error",
      message: plag.ok
        ? `Brak istotnego pokrycia z korpusem (max ${(plag.maxOverlap * 100).toFixed(1)}%)`
        : `Zbyt wysokie pokrycie z korpusem Marcina (${(plag.maxOverlap * 100).toFixed(1)}% — możliwy plagiat)`
    });
  }

  const concrete = checkConcreteDetails(fullText);
  checks.push({
    id: "concrete-details",
    ok: concrete,
    severity: "warn",
    message: concrete
      ? "Tekst zawiera konkret (liczby lub nazwy własne)"
      : "Brak konkretów — tekst może być zbyt ogólnikowy"
  });

  const sourceOk = checkSourceMention(input);
  checks.push({
    id: "source-attribution",
    ok: sourceOk,
    severity: "warn",
    message: sourceOk
      ? "Źródło wspomniane lub kontekst źródłowy obecny"
      : "Brak wzmianki o źródle w treści"
  });

  const pr = checkAntiPr(fullText);
  checks.push({
    id: "anti-pr-tone",
    ok: pr.ok,
    severity: pr.hits.length > 2 ? "error" : "warn",
    message: pr.ok
      ? "Ton nie wygląda na czysty PR"
      : `Wykryto korpo-PR: ${pr.hits.join(", ")}`
  });

  const clickbait = CLICKBAIT.some((re) => re.test(input.title) || re.test(input.lead));
  checks.push({
    id: "no-clickbait",
    ok: !clickbait,
    severity: "warn",
    message: clickbait ? "Tytuł/lead brzmi jak clickbait" : "Brak oczywistego clickbaitu"
  });

  const bodySents = splitSentences(input.bodyMarkdown);
  const avgSentLen =
    bodySents.length > 0
      ? bodySents.reduce((s, x) => s + wordCount(x), 0) / bodySents.length
      : 0;
  checks.push({
    id: "sentence-rhythm",
    ok: avgSentLen >= 8 && avgSentLen <= 35,
    severity: "warn",
    message: `Średnia długość zdania: ${avgSentLen.toFixed(1)} słów (docelowo 12–28)`
  });

  const errors = checks.filter((c) => !c.ok && c.severity === "error").length;
  const score =
    checks.filter((c) => c.ok).length / Math.max(checks.length, 1);

  return {
    ok: errors === 0,
    score: Math.round(score * 100) / 100,
    checks
  };
}

export async function loadCorpusShingles(shinglesPath: string): Promise<Set<string>> {
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(shinglesPath, "utf8")) as string[];
  return new Set(raw);
}
