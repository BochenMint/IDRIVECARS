/**
 * Cleans up common MDX import artifacts in car-review articles.
 *
 * Problems addressed:
 *  1. Broken bold-subheadings: `**Heading\n**rest` → `### Heading\n\nrest`
 *  2. Body H1s: the real article title is extracted as `headline` (brand-aware),
 *     remaining H1s are demoted to H2 so the page keeps a single <h1>.
 *  3. Double-escaped HTML entities: &lt; → <, &gt; → >, etc.
 */

/** Lowercase + strip diacritics & non-alphanumerics for tolerant matching. */
function normalizeForMatch(value?: string): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "");
}

export function cleanArticleMarkdown(
  raw: string,
  opts: { brand?: string; model?: string } = {}
): { markdown: string; headline?: string } {
  // Normalize line endings to \n
  let markdown = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 1. Fix broken bold-subheadings FIRST.
  // Pattern: a line opening with ** with no closing ** on the same line, then a
  // newline followed by ** (which was meant to close but opens the next block).
  //   **Ostre krągłości\n**Z przodu...  →  ### Ostre krągłości\n\nZ przodu...
  markdown = markdown.replace(/^\*\*([^\n*][^\n]*?)[ \t]*\n\*\*/gm, "### $1\n\n");

  // 2. Choose the article title among body H1s (single `# `).
  // The first H1 is NOT always the title — some files lead with an editorial note
  // (e.g. "# Termin testu: 12-15.05") or a stylistic slogan ("# Radość z jazdy...")
  // that lacks the car name. So we only adopt a body H1 as the title when it
  // mentions the brand or the model; otherwise the (reliable) frontmatter title
  // wins (headline = undefined). No "sole H1" fallback — it picked up slogans.
  const brandNorm = normalizeForMatch(opts.brand);
  const modelNorm = normalizeForMatch(opts.model);
  const mentionsCar = (text: string): boolean => {
    const n = normalizeForMatch(text);
    return (
      (brandNorm.length >= 2 && n.includes(brandNorm)) ||
      (modelNorm.length >= 3 && n.includes(modelNorm))
    );
  };
  const h1Regex = /^#(?!#)[ \t]+(.+?)[ \t]*$/gm;
  const h1Matches = [...markdown.matchAll(h1Regex)];

  let headline: string | undefined;
  let chosenLine: string | undefined;
  const chosen = h1Matches.find((m) => mentionsCar(m[1]));
  if (chosen) {
    headline = chosen[1].trim();
    chosenLine = chosen[0];
  }

  // Remove only the chosen title line (first literal occurrence).
  if (chosenLine) {
    markdown = markdown.replace(chosenLine, "");
  }

  // 3. Demote any REMAINING body H1 (`# `) to H2 (`## `) — never compete with the
  // single page <h1>. Multi-hash headings (##, ###) are untouched.
  markdown = markdown.replace(/^#(?!#)[ \t]+/gm, "## ");

  // 4. Decode double-escaped HTML entities so inline tags survive remark.
  // Order matters: &amp; must be decoded LAST to avoid double-decoding.
  markdown = markdown
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  // 5. Usuń sieroty markdown z importu autoGALERII (puste ** **, linie z samymi **).
  markdown = stripOrphanMarkdownEmphasis(markdown);

  // 6. Usuń zduplikowane Zalety/Wady/Podsumowanie (inline **X:** + sekcje ## X z compose).
  markdown = dedupeImportedProsConsSections(markdown);

  // 7. Podnieś poziomy nagłówków w body, żeby pod stronowym H1 nie zaczynać od H3.
  markdown = normalizeBodyHeadingLevels(markdown);

  return { markdown, headline };
}

/**
 * Gdy najpłytszy nagłówek w body to ### lub głębiej, obniż wszystkie o brakujące
 * poziomy — bez zmiany tekstu nagłówków (tylko liczba #).
 */
function normalizeBodyHeadingLevels(markdown: string): string {
  const levels: number[] = [];
  for (const match of markdown.matchAll(/^(#{1,6})[ \t]+/gm)) {
    levels.push(match[1].length);
  }
  if (levels.length === 0) return markdown;

  const minLevel = Math.min(...levels);
  if (minLevel <= 2) return markdown;

  const reduce = minLevel - 2;
  return markdown.replace(/^(#{1,6})([ \t]+)/gm, (_line, hashes: string, space: string) => {
    const newLen = Math.max(2, hashes.length - reduce);
    return "#".repeat(newLen) + space;
  });
}

/** Usuwa uszkodzone znaczniki emfazy z importu — bez zmiany brzmienia zdań. */
function stripOrphanMarkdownEmphasis(markdown: string): string {
  let out = markdown;

  // Linie składające się wyłącznie z markerów emfazy (np. samotne "**" na końcu pliku).
  out = out.replace(/^[ \t]*\*{1,2}[ \t]*$/gm, "");
  out = out.replace(/^[ \t]*_{1,2}[ \t]*$/gm, "");

  // Puste pary bold/italic: "** **", "__ __"
  out = out.replace(/\*{2}[ \t\u00a0]*\*{2}/g, "");
  out = out.replace(/_{2}[ \t\u00a0]*_{2}/g, "");

  // Końcowa sierota ** na linii z nieparzystą liczbą markerów (import zjadł otwarcie).
  out = out
    .split("\n")
    .map((line) => {
      const markers = line.match(/\*\*/g)?.length ?? 0;
      if (markers % 2 === 1 && /\*\*[ \t]*$/.test(line)) {
        return line.replace(/\*\*[ \t]*$/, "");
      }
      return line;
    })
    .join("\n");

  // Zamknięcie akapitu + pusta linia ze sierotą: "...tekst.**\n**" → "...tekst."
  out = out.replace(/(\S)\.\*{2}[ \t]*\n[ \t]*\*{2}[ \t]*(?=\n|$)/g, "$1.");

  // Końcowa sierota po kropce na tej samej linii: "...tekst.** **"
  out = out.replace(/(\S)\.\*{2}[ \t]+\*{2}(?=\s|$)/g, "$1.");

  return out;
}

const INLINE_PROS_BLOCK =
  /\*\*Zalety:\*\*\s*\n(?:[ \t]*(?:[\+\-•]|\d+\.)\s*.+\n?)*/i;
const INLINE_CONS_BLOCK =
  /\*\*Wady:\*\*\s*\n(?:[ \t]*(?:[\+\-•]|\d+\.)\s*.+\n?)*/i;
const INLINE_SUMMARY_BLOCK =
  /\*\*Podsumowanie:\*\*\s*\n[\s\S]*?(?=\n##\s|\n\*\*[A-ZĄĆĘŁŃÓŚŹŻ]|\s*$)/i;

/**
 * Import autoGALERII zostawia w body inline Zalety/Wady, a compose dokłada nagłówki ##.
 * Przy renderze zostawiamy sekcje ## — usuwamy wcześniejsze duplikaty inline.
 */
export function dedupeImportedProsConsSections(markdown: string): string {
  let out = markdown;

  if (/^##\s+Zalety\s*$/im.test(out)) {
    out = out.replace(INLINE_PROS_BLOCK, "");
  }
  if (/^##\s+Wady\s*$/im.test(out)) {
    out = out.replace(INLINE_CONS_BLOCK, "");
  }
  if (/^##\s+Podsumowanie\s*$/im.test(out)) {
    out = out.replace(INLINE_SUMMARY_BLOCK, "");
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}
