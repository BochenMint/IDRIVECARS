/**
 * Walidacja faktów AI vs materiał źródłowy.
 * Nie rozstrzyga prawdy globalnej — wykrywa liczby/datę/waluty/modelowe
 * wprowadzone w outputcie AI, których nie ma w raw RSS / prompcie.
 */

import type { AiDraftOutput } from "./types";

export type FactCheckInput = {
  sourceText: string;
  output: Pick<AiDraftOutput, "title" | "lead" | "bodyMarkdown">;
  /** ISO date z raw — dozwolone składowe daty publikacji */
  publishedAt?: string;
};

export type FactCheckIssue = {
  kind: "number" | "date" | "currency" | "percent" | "model";
  value: string;
  context?: string;
};

export type FactCheckResult = {
  ok: boolean;
  issues: FactCheckIssue[];
  sourceStats: { numbers: number; dates: number; models: number };
  outputStats: { numbers: number; dates: number; models: number };
  warnings: string[];
};

function normalizeNumber(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  s = s.replace(/\s+/g, "");
  s = s.replace(/,/g, ".");
  if (!s || s === ".") return null;
  const m = s.match(/^(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  if (n >= 1900 && n <= 2100 && Number.isInteger(n)) return String(Math.round(n));
  if (Number.isInteger(n)) return String(Math.round(n));
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

function extractNumbers(text: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const patterns = [
    /\b(\d{1,3}(?:[ \u00a0]\d{3})+(?:[.,]\d+)?)\b/g,
    /\b(\d+[.,]\d+)\b/g,
    /\b(\d{2,})\b/g,
    /\b(\d+)\s*(?:%|proc\.?|procent)\b/gi
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const raw = m[1];
      const norm = normalizeNumber(raw);
      if (!norm) continue;
      const arr = map.get(norm) ?? [];
      arr.push(raw);
      map.set(norm, arr);
    }
  }
  return map;
}

const MONTH_MAP: Record<string, string> = {
  stycznia: "01",
  lutego: "02",
  marca: "03",
  kwietnia: "04",
  maja: "05",
  czerwca: "06",
  lipca: "07",
  sierpnia: "08",
  wrzesnia: "09",
  września: "09",
  pazdziernika: "10",
  października: "10",
  listopada: "11",
  grudnia: "12",
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12"
};

function extractDates(text: string): Set<string> {
  const dates = new Set<string>();
  for (const m of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    dates.add(`${m[1]}-${m[2]}-${m[3]}`);
  }
  for (const m of text.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g)) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    dates.add(`${m[3]}-${mm}-${dd}`);
  }
  for (const m of text.matchAll(
    /\b(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|wrzesnia|października|pazdziernika|listopada|grudnia)\s+(20\d{2})\b/gi
  )) {
    const mm = MONTH_MAP[m[2].toLowerCase()];
    if (mm) dates.add(`${m[3]}-${mm}-${m[1].padStart(2, "0")}`);
  }
  for (const m of text.matchAll(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/gi
  )) {
    const mm = MONTH_MAP[m[1].toLowerCase()];
    if (mm) dates.add(`${m[3]}-${mm}-${m[2].padStart(2, "0")}`);
  }
  for (const m of text.matchAll(/\((\w+\s+\d{1,2},?\s+20\d{2})\)/g)) {
    const inner = m[1];
    const sub = extractDates(inner);
    for (const d of sub) dates.add(d);
  }
  return dates;
}

function extractCurrencies(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(
    /\b(\d+(?:[.,]\d+)?)\s*(mln|mld|bln|tys\.?|tysięcy|tysiac|billion|million|trillion|usd|eur|pln|zł|zl|\$|€)\b/gi
  )) {
    const norm = normalizeNumber(m[1]);
    if (norm) out.add(`${norm}:${m[2].toLowerCase()}`);
  }
  for (const m of text.matchAll(/\$\s*(\d+(?:[.,]\d+)?)/g)) {
    const norm = normalizeNumber(m[1]);
    if (norm) out.add(`${norm}:usd`);
  }
  return out;
}

function extractPercents(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*%/g)) {
    const norm = normalizeNumber(m[1]);
    if (norm) out.add(norm);
  }
  return out;
}

/** Numery modeli / oznaczenia silników (911, 328i, V8, AMG GT S). */
function extractModelTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(
    /\b([A-Za-z]{1,4}[- ]?\d{2,4}[A-Za-z]?|\d{3}[A-Za-z]?|V\d{1,2}|R\d|E\d{1,2}|i\d|xDrive|quattro|4MATIC)\b/g
  )) {
    out.add(m[1].toLowerCase().replace(/\s+/g, ""));
  }
  return out;
}

function allowedFromPublishedAt(publishedAt?: string): { years: Set<string>; dates: Set<string> } {
  const years = new Set<string>();
  const dates = new Set<string>();
  if (!publishedAt) return { years, dates };
  const d = new Date(publishedAt);
  if (!Number.isNaN(d.getTime())) {
    years.add(String(d.getUTCFullYear()));
    const iso = d.toISOString().slice(0, 10);
    dates.add(iso);
    const day = String(d.getUTCDate());
    const month = String(d.getUTCMonth() + 1);
    years.add(String(d.getUTCFullYear()));
    dates.add(`${d.getUTCFullYear()}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }
  const m = publishedAt.match(/(20\d{2})/);
  if (m) years.add(m[1]);
  return { years, dates };
}

export function validateAiFactCheck(input: FactCheckInput): FactCheckResult {
  const sourceText = input.sourceText;
  const outputText = `${input.output.title}\n${input.output.lead}\n${input.output.bodyMarkdown}`;
  const { years: allowedYears, dates: allowedDates } = allowedFromPublishedAt(input.publishedAt);

  const sourceNums = extractNumbers(sourceText);
  const outputNums = extractNumbers(outputText);
  const sourceDates = extractDates(sourceText);
  const outputDates = extractDates(outputText);
  const sourceCurr = extractCurrencies(sourceText);
  const outputCurr = extractCurrencies(outputText);
  const sourcePct = extractPercents(sourceText);
  const outputPct = extractPercents(outputText);
  const sourceModels = extractModelTokens(sourceText);
  const outputModels = extractModelTokens(outputText);

  for (const y of allowedYears) sourceNums.set(y, ["publishedAt"]);
  for (const d of allowedDates) sourceDates.add(d);

  for (const d of [...sourceDates, ...allowedDates]) {
    const [y, m, day] = d.split("-");
    if (y) sourceNums.set(y, ["date-component"]);
    if (m) {
      sourceNums.set(m, ["date-component"]);
      sourceNums.set(String(parseInt(m, 10)), ["date-component"]);
    }
    if (day) {
      sourceNums.set(day, ["date-component"]);
      sourceNums.set(String(parseInt(day, 10)), ["date-component"]);
    }
  }

  const issues: FactCheckIssue[] = [];
  const warnings: string[] = [];

  for (const [norm, rawVals] of outputNums) {
    if (sourceNums.has(norm)) continue;
    if (allowedYears.has(norm)) continue;
    if (norm.length === 1) continue;
    issues.push({
      kind: "number",
      value: norm,
      context: rawVals[0]
    });
  }

  for (const d of outputDates) {
    if (sourceDates.has(d)) continue;
    if (allowedDates.has(d)) continue;
    const year = d.slice(0, 4);
    if (allowedYears.has(year) && sourceDates.size === 0) {
      warnings.push(`Data ${d} — rok zgodny z publishedAt, ale pełna data nie w źródle`);
      continue;
    }
    issues.push({ kind: "date", value: d });
  }

  for (const c of outputCurr) {
    if (!sourceCurr.has(c)) {
      const [num] = c.split(":");
      if (sourceNums.has(num)) continue;
      issues.push({ kind: "currency", value: c });
    }
  }

  for (const p of outputPct) {
    if (!sourcePct.has(p)) {
      issues.push({ kind: "percent", value: `${p}%` });
    }
  }

  for (const model of outputModels) {
    if (model.length < 3) continue;
    if (/^\d{1,2}$/.test(model)) continue;
    if (sourceModels.has(model)) continue;
    if (TECH_MODEL_ALLOW.has(model)) continue;
    issues.push({ kind: "model", value: model });
  }

  return {
    ok: issues.length === 0,
    issues,
    sourceStats: {
      numbers: sourceNums.size,
      dates: sourceDates.size,
      models: sourceModels.size
    },
    outputStats: {
      numbers: outputNums.size,
      dates: outputDates.size,
      models: outputModels.size
    },
    warnings
  };
}

const TECH_MODEL_ALLOW = new Set(["v8", "v6", "v12", "r4", "ev", "evtol", "suv", "awd", "rwd"]);

export function formatFactCheckReport(result: FactCheckResult): string {
  const lines: string[] = [];
  if (result.ok) {
    lines.push("Fact-check OK — brak nieuprawnionych liczb/dat względem źródła");
  } else {
    lines.push(`Fact-check FAIL — ${result.issues.length} problem(ów):`);
    for (const i of result.issues) {
      lines.push(`  [${i.kind}] ${i.value}${i.context ? ` (np. „${i.context}”)` : ""}`);
    }
  }
  for (const w of result.warnings) lines.push(`  WARN: ${w}`);
  lines.push(
    `Źródło: ${result.sourceStats.numbers} liczb, ${result.sourceStats.dates} dat | Output: ${result.outputStats.numbers} liczb, ${result.outputStats.dates} dat`
  );
  return lines.join("\n");
}
