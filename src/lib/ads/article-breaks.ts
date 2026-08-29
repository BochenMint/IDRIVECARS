/**
 * Dzieli HTML artykułu na segmenty pod slot śródtekstowy (po ~8 akapitach).
 * Nie wstawia reklam w środku akapitu — tylko w długich tekstach.
 */
export type ArticleSegment = { type: "html"; html: string } | { type: "ad-break"; id: string };

/** Min. akapitów + znaków treści, żeby wstawić reklamę śródtekstową. */
const MIN_PARAGRAPHS_FOR_MID_AD = 12;
const MIN_PLAIN_CHARS_FOR_MID_AD = 4500;
const PARAGRAPH_BREAK_AFTER = 8;

function plainTextLength(html: string): number {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

export function articleQualifiesForMidAd(html: string): boolean {
  const paragraphs = [...html.matchAll(/<\/p>/gi)].length;
  return paragraphs >= MIN_PARAGRAPHS_FOR_MID_AD && plainTextLength(html) >= MIN_PLAIN_CHARS_FOR_MID_AD;
}

export function splitArticleHtmlForAds(html: string): ArticleSegment[] {
  if (!articleQualifiesForMidAd(html)) {
    return [{ type: "html", html }];
  }

  const closingTags = [...html.matchAll(/<\/p>/gi)];
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

export function articleHasMidAd(segments: ArticleSegment[]): boolean {
  return segments.some((s) => s.type === "ad-break");
}
