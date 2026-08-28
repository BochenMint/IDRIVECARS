/**
 * Dzieli HTML artykułu na segmenty pod slot śródtekstowy (po ~5 akapitach).
 * Nie wstawia reklam w środku akapitu.
 */
export type ArticleSegment = { type: "html"; html: string } | { type: "ad-break"; id: string };

const MIN_PARAGRAPHS_FOR_MID_AD = 6;
const PARAGRAPH_BREAK_AFTER = 5;

export function splitArticleHtmlForAds(html: string): ArticleSegment[] {
  const closingTags = [...html.matchAll(/<\/p>/gi)];
  if (closingTags.length < MIN_PARAGRAPHS_FOR_MID_AD) {
    return [{ type: "html", html }];
  }

  const cutTag = closingTags[PARAGRAPH_BREAK_AFTER - 1];
  if (!cutTag || cutTag.index === undefined) {
    return [{ type: "html", html }];
  }

  const cutAt = cutTag.index + cutTag[0].length;
  return [
    { type: "html", html: html.slice(0, cutAt) },
    { type: "ad-break", id: "mid-1" },
    { type: "html", html: html.slice(cutAt) }
  ];
}
