import { getAllArticleMetas } from "@/lib/content/articles";
import { articlePublicPath } from "@/lib/content/categories";
import { toMetaDescription } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const tests = await getAllArticleMetas();
  const items = tests.slice(0, 30);

  const lastBuildDate = items.length > 0
    ? new Date(items[0].publishedAt).toUTCString()
    : new Date().toUTCString();

  const itemsXml = items
    .map((test) => {
      const link = `${SITE_URL}${articlePublicPath(test.category, test.slug)}`;
      const description = escapeXml(toMetaDescription(test.lead ?? null));
      const pubDate = new Date(test.publishedAt).toUTCString();
      return `    <item>
      <title>${escapeXml(test.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>pl-pl</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
