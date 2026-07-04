import type { FetchedNewsItem, NewsSourceConfig } from "../types";

const UA = "IDRIVECARS-NewsBot/1.0 (+https://idrivecars.pl)";

/** Naprawia typowe błędy XML w polskich feedach RSS. */
function sanitizeRssXml(xml: string): string {
  let out = xml
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-f]+;)/gi, "&amp;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  out = out.replace(
    /(<description[^>]*>)([\s\S]*?)(<\/description>)/gi,
    (_, open: string, content: string, close: string) =>
      open + content.replace(/<(?![a-z/!?])/gi, "&lt;") + close
  );
  out = out.replace(
    /(<content:encoded[^>]*>)([\s\S]*?)(<\/content:encoded>)/gi,
    (_, open: string, content: string, close: string) =>
      open + content.replace(/<(?![a-z/!?])/gi, "&lt;") + close
  );
  return out;
}

export async function fetchFromRss(source: NewsSourceConfig): Promise<FetchedNewsItem[]> {
  const Parser = (await import("rss-parser")).default;
  const parser = new Parser({
    timeout: 25_000,
    headers: { "User-Agent": UA }
  });

  const res = await fetch(source.fetchUrl, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(25_000)
  });
  if (!res.ok) throw new Error(`Status code ${res.status}`);

  const rawBody = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  const looksLikeRss =
    /xml|rss/i.test(contentType) ||
    rawBody.trimStart().startsWith("<?xml") ||
    /<rss[\s>]/i.test(rawBody) ||
    /<feed[\s>]/i.test(rawBody);
  if (!looksLikeRss) {
    throw new Error(
      `Odpowiedź nie jest RSS/XML (content-type: ${contentType || "brak"}). ` +
        `Sprawdź fetchUrl — katalog HTML (/rss/) to nie feed; użyj np. /rss/newsy/.`
    );
  }

  const rawXml = sanitizeRssXml(rawBody);
  const feed = await parser.parseString(rawXml);
  const max = source.maxItemsPerRun ?? 10;

  return (feed.items ?? []).slice(0, max).map((item) => {
    const pubDate = item.pubDate
      ? new Date(item.pubDate).toISOString()
      : item.isoDate ?? new Date().toISOString();
    const content = item.contentSnippet ?? item.content ?? item.summary ?? "";
    const imageUrl =
      (item.enclosure?.url && item.enclosure.type?.startsWith("image")
        ? item.enclosure.url
        : undefined) ?? extractFirstImageFromHtml(item.content ?? "");

    return {
      title: (item.title ?? "").trim(),
      sourceUrl: (item.link ?? item.guid ?? "").trim(),
      publishedAt: pubDate,
      lead: content.slice(0, 400).replace(/\s+/g, " ").trim(),
      bodyText: content,
      images: imageUrl ? [{ url: imageUrl, license: "Sprawdź źródło RSS" }] : []
    } satisfies FetchedNewsItem;
  });
}

function extractFirstImageFromHtml(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}
