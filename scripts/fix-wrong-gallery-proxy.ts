/**
 * Usuwa galleryDir z artykułów z błędnym proxy (inna marka/model niż test).
 * Uruchom: npx tsx scripts/fix-wrong-gallery-proxy.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

/** Artykuły z obcą galerią — lepiej brak zdjęć niż zła marka. */
const SLUGS = [
  "citroen-c-elysee-16-hdi-seduction",
  "citroen-c3",
  "honda-civic-16-i-dtec-marzenia-ziemii",
  "honda-cr-v",
  "opel-astra-gtc-20-cdti-sport",
  "opel-zafira-tourer",
  "pierwsza-jazda-c4-cactus",
  "pierwsza-jazda-c4-picasso",
  "pierwsza-jazda-citroen-c1-ciasna-konkurencja",
  "alfa-romeo-giulietta-nie-tylko-dla-wtajemniczonych",
  "alfa-romeo-giulietta-quadrifoglio-verde-1750-tbi",
  "alfa-romeo-giulietta-test",
  "aston-martin-motorsport",
  "audi-a8-fl",
  "audi-s3-sportback-quattro",
  "audi-tt",
  "bmw-328i-xdrive-niech-zyje-dynamika",
  "bmw-x6-m50d",
  "bmw-x6-m50d-fl",
  "byd-e6",
  "dacia-sandero-09-tce-laureate",
  "evoque-convertible-concept",
  "fiat-500-by-gucci",
  "fiat-500l-16-16v-pop-star",
  "fiat-panda",
  "ford-fiesta",
  "ford-focus-10-ecoboost",
  "ford-focus-st-kombi-20-ecoboost",
  "ford-kuga",
  "ford-transit-custom",
  "hyundai-i20",
  "kia-rio",
  "lexus-rx",
  "lexus-rx-350-f-sport",
  "mercedes-c200",
  "mercedes-citan-109-cdi",
  "mercedes-cla-250-4matic-7g-dct",
  "mercedes-glk-350cdi",
  "mini-cooper-roadster-s",
  "mini-cooper-s-rauno-aaltonen",
  "mitsubishi-i-miev-evolution",
  "mitsubishi-outlander-sport",
  "nissan-lv200-evalia-1",
  "nissan-micra-12-dig-s",
  "nissan-qashqai",
  "nowe-audi-a3",
  "nowy-jeep-cherokee",
  "nowa-skoda-octavia",
  "peugeot-308-16-thp",
  "peugeot-308-sw",
  "peugeot-308-vs-vw-golf-vii",
  "pierwsza-jazda-a3-limo",
  "pierwsza-jazda-abarth-595-turismo",
  "pierwsza-jazda-corvette-c7",
  "pierwsza-jazda-jeep-grand-cherokee-bardziej-grand",
  "pierwsza-jazda-micra",
  "pierwsza-jazda-miusubishi-outlander-phev",
  "pierwsza-jazda-note",
  "pierwsza-jazda-panamera-diesel-i-s-e-hybrid",
  "pierwsza-jazda-polo",
  "pierwsza-jazda-porsche-panamera-turbo-executive-lwb-chce-wiecej",
  "pierwsza-jazda-rapid-spaceback",
  "pierwsza-jazda-rcz-r",
  "pierwsza-jazda-rs6",
  "pierwsza-jazda-rs7",
  "pierwsza-jazda-tourneo-jastarnia",
  "pierwsza-jazda-vw-golf-gti",
  "porownanie-rav4",
  "porsche-911-targa-4s-dane-techniczne",
  "porsche-boxster-s",
  "prezentacja-scirocco",
  "redbull",
  "renault-fluence-ze",
  "renault-twingo",
  "renault-twizy",
  "rolls-royce-wraith",
  "seat-ibiza-12-tsi-ecomotive",
  "seat-leon-cupra-280",
  "seat-leon-cupra-280-vs-volkswagen-golf-r",
  "seat-leon-cupra-280-vs-volkswagen-golf-r-dk-etap-1",
  "seat-leon-fr-20-tdi",
  "skoda-citigo-10-mpi-elegance-abc",
  "skoda-fabia-kombi-12-tsi",
  "skoda-octavia-combi-18-tsi-4x4",
  "toyota-auris-prestige-hybrid",
  "volkswagen-california",
  "volkswagen-cc-20-tdi-r-line",
  "volkswagen-golf-gtd-variant",
  "volkswagen-golf-sportsvan",
  "volkswagen-golf-variant-20-tdi-highline",
  "volkswagen-jetta-hybrid",
  "volkswagen-scirocco-r",
  "volvo-v40-r-design",
  "vw-cc-36-v6"
];

const CONTENT = path.join(process.cwd(), "content", "testy");
const CONFIG = path.join(process.cwd(), "scripts", "gallery-links.json");

function rewriteMdx(data: Record<string, unknown>, content: string): string {
  const frontmatter = Object.entries(data)
    .map(([k, v]) => {
      if (typeof v === "string" && (v.includes(":") || v.includes('"') || v.includes("\n"))) {
        return `${k}: "${String(v).replace(/"/g, '\\"')}"`;
      }
      if (Array.isArray(v)) return `${k}: [${v.map((x) => `"${x}"`).join(", ")}]`;
      return `${k}: ${JSON.stringify(v)}`;
    })
    .join("\n");
  return `---\n${frontmatter}\n---\n\n${content}`;
}

async function main() {
  const config = JSON.parse(await fs.readFile(CONFIG, "utf8")) as {
    articleToGallery: Record<string, string>;
  };

  let cleared = 0;

  for (const slug of SLUGS) {
    delete config.articleToGallery[slug];
    const filePath = path.join(CONTENT, `${slug}.mdx`);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const { data, content } = matter(raw);
      if (!data.galleryDir) continue;
      delete data.galleryDir;
      await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
      cleared += 1;
      console.log(`  cleared galleryDir: ${slug}`);
    } catch {
      /* brak pliku */
    }
  }

  await fs.writeFile(CONFIG, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`\nUsunięto galleryDir z ${cleared} artykułów i wpisy proxy z gallery-links.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
