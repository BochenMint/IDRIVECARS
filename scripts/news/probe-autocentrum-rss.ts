#!/usr/bin/env npx tsx
const UA = "IDRIVECARS-NewsBot/1.0";

async function main() {
  const res = await fetch("https://www.autocentrum.pl/rss/", {
    headers: { "User-Agent": UA }
  });
  const html = await res.text();
  console.log("status:", res.status, "ctype:", res.headers.get("content-type"));

  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const rssLinks = links.filter((l) => /rss|feed|xml/i.test(l));
  console.log("RSS-like links:", [...new Set(rssLinks)].slice(0, 20));

  for (const candidate of [
    "https://www.autocentrum.pl/rss/newsy.xml",
    "https://www.autocentrum.pl/rss/news.xml",
    "https://www.autocentrum.pl/rss/aktualnosci.xml",
    "https://www.autocentrum.pl/feed/",
    "https://www.autocentrum.pl/rss/newsy/",
  ]) {
    try {
      const r = await fetch(candidate, { headers: { "User-Agent": UA } });
      const t = await r.text();
      const isRss = t.includes("<rss") || t.includes("<feed");
      console.log(candidate, "→", r.status, r.headers.get("content-type"), isRss ? "RSS" : "NOT RSS", t.slice(0, 80).replace(/\n/g, " "));
    } catch (e) {
      console.log(candidate, "→ ERR", e);
    }
  }
}

main();
