import { getNewsItems } from "@/lib/content/news";
import { SITE_NAME } from "@/lib/site";
import { buildNewsCanonicalUrl } from "@/lib/news/seo";

export const runtime = "nodejs";
export const revalidate = 3600;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(): Promise<Response> {
  const items = await getNewsItems(100);
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recent = items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);

  const urls = recent
    .map((item) => {
      const loc = item.canonicalUrl ?? buildNewsCanonicalUrl(item.slug);
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>pl</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(item.publishedAt)}</news:publication_date>
      <news:title>${escapeXml(item.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
    }
  });
}
