import type { FewShotExample, FewShotQuery, StyleArticleKind, StyleCorpusEntry } from "./types";
import { normalizeText, tokenizeForMatch } from "./text-utils";

const KIND_BOOST: Record<StyleArticleKind, number> = {
  news: 3,
  felieton: 2,
  test: 1,
  "pierwsza-jazda": 1,
  blog: 2,
  galeria: 0,
  other: 0
};

function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  let hits = 0;
  for (const t of a) {
    if (setB.has(t)) hits++;
  }
  return hits;
}

/**
 * Wybiera kilka przykładów few-shot z korpusu po marce/modelu/tagach/słowach kluczowych.
 * Zwraca skrócone fragmenty (lead + excerpt) — nie pełne artykuły.
 */
export function selectFewShotExamples(
  corpus: StyleCorpusEntry[],
  query: FewShotQuery,
  limit = 3
): FewShotExample[] {
  const prefer = query.preferKind ?? ["news", "felieton", "test"];
  const queryTokens = tokenizeForMatch(
    [query.title, query.lead ?? "", ...(query.keywords ?? []), query.brand ?? "", query.model ?? ""].join(" ")
  );
  const queryTags = (query.tags ?? []).map((t) => normalizeText(t));
  const queryBrand = query.brand ? normalizeText(query.brand) : "";
  const queryModel = query.model ? normalizeText(query.model) : "";

  const scored: FewShotExample[] = [];

  for (const entry of corpus) {
    let score = 0;
    const reasons: string[] = [];

    if (prefer.includes(entry.kind)) {
      score += KIND_BOOST[entry.kind] ?? 0;
      reasons.push(`kind:${entry.kind}`);
    }

    const entryTokens = tokenizeForMatch(
      [entry.title, entry.lead, entry.bodyPlain.slice(0, 500), ...entry.tags, ...entry.brands, ...entry.models].join(" ")
    );
    const tokenHits = overlapScore(queryTokens, entryTokens);
    if (tokenHits) {
      score += tokenHits * 2;
      reasons.push(`tokens:${tokenHits}`);
    }

    for (const tag of entry.tags) {
      if (queryTags.includes(normalizeText(tag))) {
        score += 3;
        reasons.push(`tag:${tag}`);
      }
    }

    for (const brand of entry.brands) {
      if (queryBrand && (brand.includes(queryBrand) || queryBrand.includes(brand))) {
        score += 5;
        reasons.push(`brand:${brand}`);
      }
      if (query.manufacturerId && normalizeText(query.manufacturerId).includes(brand)) {
        score += 4;
        reasons.push(`manufacturer:${brand}`);
      }
    }

    if (queryModel) {
      const titleNorm = normalizeText(entry.title);
      if (titleNorm.includes(queryModel) || entry.models.some((m) => normalizeText(m).includes(queryModel))) {
        score += 6;
        reasons.push("model-match");
      }
    }

    if (entry.lead.length < 30) score -= 2;

    if (score <= 0) continue;

    const excerpt =
      entry.kind === "news" || entry.kind === "felieton"
        ? entry.excerpts.opening.slice(0, 350)
        : `${entry.excerpts.opening.slice(0, 200)}…`;

    scored.push({
      slug: entry.slug,
      title: entry.title,
      kind: entry.kind,
      lead: entry.lead.slice(0, 280),
      excerpt,
      score,
      reason: reasons.join(", ")
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatFewShotBlock(examples: FewShotExample[]): string {
  if (!examples.length) return "";
  const blocks = examples.map(
    (ex, i) =>
      `### Przykład ${i + 1} (${ex.kind}, dopasowanie: ${ex.score})\nTytuł: ${ex.title}\nLead: ${ex.lead}\nFragment stylu: ${ex.excerpt}\n(Uwaga: nie kopiuj tych zdań — to wzorzec rytmu i tonu.)`
  );
  return `--- WZORCE STYLU (few-shot, tylko inspiracja) ---\n${blocks.join("\n\n")}`;
}
