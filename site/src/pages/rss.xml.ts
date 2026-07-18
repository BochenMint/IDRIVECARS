import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { siteConfig, absoluteUrl } from '../lib/site';

export const GET: APIRoute = async () => {
  const [tests, news] = await Promise.all([getCollection('tests'), getCollection('news')]);

  const items = [
    ...tests.map((t) => ({
      title: t.data.title,
      link: absoluteUrl(`/testy/${t.data.slug}`),
      date: new Date(t.data.publishedAt),
      description: t.data.lead ?? t.data.title,
    })),
    ...news.map((n) => ({
      title: n.data.title,
      link: absoluteUrl(`/news/${n.data.slug}`),
      date: new Date(n.data.publishedAt),
      description: n.data.lead ?? n.data.title,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const rssItems = items
    .map(
      (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.link}</guid>
      <pubDate>${item.date.toUTCString()}</pubDate>
      <description><![CDATA[${item.description}]]></description>
    </item>`,
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteConfig.name}</title>
    <link>${siteConfig.url}</link>
    <description>${siteConfig.description}</description>
    <language>pl</language>
    <atom:link href="${absoluteUrl('/rss.xml')}" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
