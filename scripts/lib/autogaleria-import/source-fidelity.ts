/**
 * Compares CMS MDX body against staged autoGALERIA import JSON.
 * Used by audit:source-fidelity and slug-conflict reporting.
 */

export type ImportHeading = { level?: number; text: string };

export type ImportArticleLike = {
  slug: string;
  title?: string;
  lead?: string;
  excerpt?: string;
  bodyMarkdown?: string;
  headings?: ImportHeading[];
};

export type FidelityIssue =
  | "length-mismatch"
  | "low-similarity"
  | "lead-mismatch"
  | "heading-mismatch"
  | "ai-hallmark"
  | "missing-source-import";

export type FidelityReport = {
  slug: string;
  mdxPath: string;
  importPath: string | null;
  bodyLengthMdx: number;
  bodyLengthImport: number;
  lengthRatio: number;
  similarity: number;
  leadSimilarity: number;
  headingOverlap: number;
  missingImportHeadings: string[];
  issues: FidelityIssue[];
  lowFidelity: boolean;
  reason: string;
};

export const AI_HALLMARK =
  /tekst pierwotnie opublikowany na autogaleria|używane egzemplarze|w rzeczywistej jeździe|to auto na weekendową trasę|jak na auto o masie ponad/i;

export function normalizeForCompare(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/[#>*_\[\]()!|`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function extractHeadingTexts(markdown: string): string[] {
  const headings: string[] = [];
  for (const line of markdown.split("\n")) {
    const m = line.match(/^#{1,6}\s+\*{0,2}(.+?)\*{0,2}\s*$/);
    if (m) headings.push(normalizeHeading(m[1]));
  }
  // Bold section headers used by Marcin: **Podczas normalnej jazdy...**
  for (const line of markdown.split("\n")) {
    const m = line.match(/^\*\*(.+?)\.{0,3}\*\*\s*$/);
    if (m && m[1].length > 8) headings.push(normalizeHeading(m[1]));
  }
  return headings.filter(Boolean);
}

function normalizeHeading(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\.{3,}$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenSet(text: string): Set<string> {
  const normalized = normalizeForCompare(text);
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 2);
  return new Set(tokens);
}

/** Jaccard similarity on word tokens. */
export function computeTokenSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union ? inter / union : 0;
}

/** Longest common substring ratio (fallback for near-duplicate with formatting diffs). */
export function computeSubstringSimilarity(a: string, b: string): number {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length >= nb.length ? na : nb;
  if (longer.includes(shorter)) return shorter.length / longer.length;

  // Sample first 500 chars overlap
  const sample = shorter.slice(0, Math.min(500, shorter.length));
  if (sample.length > 40 && longer.includes(sample)) {
    return sample.length / longer.length;
  }
  return computeTokenSimilarity(a, b);
}

export function computeLeadSimilarity(mdxLead: string | undefined, importLead: string | undefined): number {
  const a = normalizeForCompare(mdxLead ?? "");
  const b = normalizeForCompare(importLead ?? "");
  if (!a || !b) return a === b ? 1 : 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length >= b.length ? a : b;
  if (longer.startsWith(shorter.slice(0, Math.min(80, shorter.length)))) return 0.9;
  return computeTokenSimilarity(a, b);
}

export function headingOverlap(
  mdxBody: string,
  importHeadings: ImportHeading[] | undefined
): { score: number; missing: string[] } {
  const importTexts = (importHeadings ?? []).map((h) => normalizeHeading(h.text)).filter(Boolean);
  if (!importTexts.length) return { score: 1, missing: [] };

  const mdxHeadings = extractHeadingTexts(mdxBody);
  const missing: string[] = [];
  let matched = 0;

  for (const ih of importTexts) {
    const found = mdxHeadings.some(
      (mh) => mh.includes(ih) || ih.includes(mh) || computeTokenSimilarity(mh, ih) > 0.6
    );
    if (found) matched += 1;
    else missing.push(ih);
  }

  return { score: matched / importTexts.length, missing };
}

export function shouldAutoFixFromImport(report: FidelityReport): boolean {
  if (!report.lowFidelity || !report.importPath) return false;
  // Never replace substantially longer local content with shorter import stub
  if (report.lengthRatio > 1.4 && report.similarity < 0.25) return false;
  return true;
}

export function assessFidelity(
  slug: string,
  mdxPath: string,
  mdxBody: string,
  mdxLead: string | undefined,
  imported: ImportArticleLike | null,
  importPath: string | null
): FidelityReport {
  const bodyLengthMdx = mdxBody.trim().length;
  const bodyLengthImport = imported?.bodyMarkdown?.trim().length ?? 0;
  const lengthRatio =
    bodyLengthImport > 0 ? bodyLengthMdx / bodyLengthImport : bodyLengthMdx > 0 ? 999 : 1;

  if (!imported?.bodyMarkdown) {
    return {
      slug,
      mdxPath,
      importPath,
      bodyLengthMdx,
      bodyLengthImport,
      lengthRatio,
      similarity: 0,
      leadSimilarity: 0,
      headingOverlap: 0,
      missingImportHeadings: [],
      issues: ["missing-source-import"],
      lowFidelity: false,
      reason: "Brak importu JSON — pominięto porównanie treści"
    };
  }

  const similarity = computeSubstringSimilarity(mdxBody, imported.bodyMarkdown);
  const leadSimilarity = computeLeadSimilarity(mdxLead, imported.lead ?? imported.excerpt);
  const { score: headingOverlapScore, missing: missingImportHeadings } = headingOverlap(
    mdxBody,
    imported.headings
  );

  const issues: FidelityIssue[] = [];

  if (AI_HALLMARK.test(mdxBody)) issues.push("ai-hallmark");
  if (lengthRatio < 0.55 || lengthRatio > 1.8) issues.push("length-mismatch");
  if (similarity < 0.35) issues.push("low-similarity");
  if (leadSimilarity < 0.45 && bodyLengthImport > 500) issues.push("lead-mismatch");
  if (headingOverlapScore < 0.5 && (imported.headings?.length ?? 0) >= 2) {
    issues.push("heading-mismatch");
  }

  const isShortGalleryStub =
    bodyLengthMdx < 500 &&
    bodyLengthImport < 500 &&
    leadSimilarity >= 0.85 &&
    headingOverlapScore >= 0.9;

  const lowFidelity =
    !isShortGalleryStub &&
    // Existing body much longer than import + low overlap → likely different/canonical local content
    !(lengthRatio > 1.5 && similarity < 0.2) &&
    (issues.includes("ai-hallmark") && similarity < 0.75 && lengthRatio < 1.1
      ? true
      : (similarity < 0.35 && lengthRatio < 0.65) ||
        (issues.includes("lead-mismatch") && lengthRatio < 0.55) ||
        (issues.includes("heading-mismatch") && lengthRatio < 0.55 && similarity < 0.4));

  const reason = lowFidelity
    ? `Niska wierność źródła (sim=${similarity.toFixed(2)}, len=${lengthRatio.toFixed(2)}, lead=${leadSimilarity.toFixed(2)}, headings=${headingOverlapScore.toFixed(2)})`
    : issues.length
      ? `Ostrzeżenia: ${issues.join(", ")}`
      : "OK";

  return {
    slug,
    mdxPath,
    importPath,
    bodyLengthMdx,
    bodyLengthImport,
    lengthRatio,
    similarity,
    leadSimilarity,
    headingOverlap: headingOverlapScore,
    missingImportHeadings,
    issues,
    lowFidelity,
    reason
  };
}
