import { fetchFromRss } from "../../src/lib/news/adapters/rss";
import type { NewsSourceConfig } from "../../src/lib/news/types";

const tests: Array<[string, string]> = [
  ["toyota-global", "https://global.toyota/export/en/allnews_rss.xml"],
  ["ford-all", "https://media.ford.com/content/fordmedia/fna/us/en/rss/all.rss"],
  ["toyota-product", "https://pressroom.toyota.com/category/product/feed/"],
  ["stellantis", "https://www.media.stellantis.com/em-en/corporate/rss"]
];

async function main() {
  for (const [id, url] of tests) {
    const source: NewsSourceConfig = {
      id,
      name: id,
      brands: ["Test"],
      region: "US",
      sourceType: "rss",
      fetchUrl: url,
      loginRequired: false,
      enabled: true
    };
    try {
      const items = await fetchFromRss(source);
      console.log(`${id}: OK ${items.length} items`);
    } catch (e) {
      console.log(`${id}: FAIL ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main();
