/**
 * Przypisuje galleryDir do artykułów bez zdjęć — reguły marka/model + fuzzy match.
 * Uruchom: npx tsx scripts/assign-missing-galleries.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const MANIFEST_PATH = path.join(process.cwd(), "src", "data", "galleries-manifest.json");

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Reguły: wzorzec na znormalizowanym slug+title (bez myślników). */
const RULES: Array<{ match: RegExp; gallery: string }> = [
  { match: /octavia|rapidspaceback/, gallery: "dlugi-dystans-skoda-octavia-rs" },
  { match: /fabia|citigo/, gallery: "skoda-fabia-pierwsza-jazda" },
  { match: /superb|octaviacombi/, gallery: "idrive-skoda-superb-combi" },
  { match: /passat|alltrack|volkswagencc|vwcc|sportsvan|variant|jetta|scirocco|polo|golfgti|golf|california|caddy|tourneo/, gallery: "pierwsza-jazda-volkswagen-passat" },
  { match: /xl1/, gallery: "volkswagen-xl1" },
  { match: /focusrs|focusst|focus10|fiesta|kuga|transit|mondeo/, gallery: "ford-focus-rs-pierwsza-jazda" },
  { match: /alfa|giulietta|giulia/, gallery: "alfa-romeo-giulia-na-zywo" },
  { match: /maybach/, gallery: "mercedes-maybach-s-600" },
  { match: /amggt|gt86/, gallery: "mercedes-amg-gt-s" },
  { match: /gle|glk|glc|x6|x5|435i|328i|i3/, gallery: "bmw-x5-30d" },
  { match: /mercedes|cla250|cls350|citan|ccoupe|c200|cclass/, gallery: "mercedes-c-coupe-pierwsza-jazda" },
  { match: /audia6|a6allroad|a6fl|rs6|rs7/, gallery: "pierwsza-jazda-audi-a6-fl" },
  { match: /audia7|audia8|audis3|auditt|audia3|a3limo|noweaudi/, gallery: "audi-a7-30-tdi" },
  { match: /lexusnx|lexusrc|lexusrx/, gallery: "lexus-nx-300h-f-sport" },
  { match: /volvoxc90|volvov40|volvowgdyni/, gallery: "volvo-xc90-gdansk" },
  { match: /landrover|discovery|evoque|rangerover|jeep/, gallery: "land-rover-discovery-pierwsza-jazda" },
  { match: /bentley|rollsroyce|wraith/, gallery: "bentley-continental-gt-v8-s-convertible" },
  { match: /porsche|panamera|boxster|911|targa|ontrack/, gallery: "porsche-911-targa-tapety" },
  { match: /peugeot|308|508|2008|rcz/, gallery: "peugeot-508-fl" },
  { match: /nissan|qashqai|micra|pulsar|xtrail|note|evalia/, gallery: "nissan-x-trail" },
  { match: /toyota|auris|rav4/, gallery: "toyota-gt-86" },
  { match: /hyundai|kiario/, gallery: "hyundai-i10" },
  { match: /mazda|mx5/, gallery: "mazda-mx-5-nd-do-korzeni" },
  { match: /fiat500|fiatpanda|500l|abarth/, gallery: "fiat-500-pierwsza-jazda" },
  { match: /seatleon|seatibiza/, gallery: "idrive-vw-golf-gtd-variant" },
  { match: /renault|twingo|twizy|fluence/, gallery: "nissan-pulsar-pierwsza-jazda" },
  { match: /minicooper|miniroadster/, gallery: "bmw-435i-cabriolet" },
  { match: /mitsubishi|outlander|imiev/, gallery: "nissan-x-trail" },
  /* Honda, Citroën, Opel — brak dedykowanych galerii w public/galleries; nie przypisuj obcej marki */
  { match: /dacia|sandero/, gallery: "skoda-fabia-pierwsza-jazda" },
  { match: /byd|corvette|astonmartin|redbull/, gallery: "backstage" },
  { match: /dlugidystans|passatdlugi/, gallery: "passat-dlugi-dystans" }
];

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
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as {
    articleToGallery: Record<string, string>;
  };
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8")) as Record<
    string,
    unknown[]
  >;

  const available = new Set(
    Object.keys(manifest).filter((k) => Array.isArray(manifest[k]) && manifest[k].length > 0)
  );

  const files = (await fs.readdir(CONTENT_DIR)).filter(
    (f) => f.endsWith(".mdx") && !/^README\.mdx?$/i.test(f) && f !== "przykladowy-test.mdx"
  );

  let assigned = 0;

  for (const file of files) {
    const slug = file.replace(/\.mdx$/, "");
    const filePath = path.join(CONTENT_DIR, file);
    const raw = (await fs.readFile(filePath, "utf8")).replace(/\0/g, "");
    const { data, content } = matter(raw);

    const currentSlug = (data.galleryDir as string | undefined)
      ?.replace(/^galleries[\\/]/, "")
      .replace(/\\/g, "/");
    if (currentSlug && available.has(currentSlug)) continue;

    let gallery: string | null = config.articleToGallery[slug] ?? null;
    if (!gallery || !available.has(gallery)) {
      const hay = normalize(`${slug} ${data.title ?? ""} ${data.brand ?? ""} ${data.model ?? ""}`);
      for (const rule of RULES) {
        if (rule.match.test(hay) && available.has(rule.gallery)) {
          gallery = rule.gallery;
          break;
        }
      }
    }

    if (!gallery || !available.has(gallery)) continue;

    config.articleToGallery[slug] = gallery;
    data.galleryDir = `galleries/${gallery}`;
    await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
    assigned += 1;
    console.log(`  ✓ ${slug} → ${gallery}`);
  }

  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`\nPrzypisano galerie do ${assigned} artykułów.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
