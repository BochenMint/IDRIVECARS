/**
 * Agresywny skan D:\MARCIN + dopasowanie NO_DIR (ta sama marka, score ≥ próg).
 * Preferuj: npx tsx scripts/match-folders-to-articles.ts [--apply]
 * npx tsx scripts/deep-discover-photos.ts [--apply] [--extract-archives]
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import matter from "gray-matter";

/** Używa tego samego dopasowania co match-folders-to-articles.ts */
const MATCH_SCRIPT = path.join(process.cwd(), "scripts", "match-folders-to-articles.ts");

const MARCIN_ROOT = "D:\\MARCIN";
const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const TMP_IMPORT = path.join(process.cwd(), ".tmp-import");
const MAX_DEPTH = 8;

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "$recycle.bin",
  "system volume information",
  "lightroom katalog",
  "dcim",
  "wakacje 2014",
  "wakacje2014",
  "elszkowski",
  "dominik",
  "do wywołania",
  "do wywolania",
  "foty",
  "zdjęcia",
  "zdjecia",
  "zdjecia z gopro",
  "2014",
  "test",
  "porsche on track - estonia 2014 +filmy"
]);

const SKIP_PATH_PARTS = [
  "wakacje",
  "dcim",
  "node_modules",
  "elszkowski",
  "dominik\\test",
  "\\2014\\",
  "zdjęcia\\2014",
  "zdjecia\\2014"
];

const BRAND_ALIASES: Record<string, string[]> = {
  vw: ["volkswagen", "vw"],
  volkswagen: ["volkswagen", "vw"],
  mercedes: ["mercedes", "maybach", "amg"],
  mini: ["mini", "minicooper"],
  rolls: ["rolls", "royce", "rollsroyce"],
  royce: ["rolls", "royce"],
  land: ["land", "rover", "evoque", "range"],
  range: ["range", "rover", "evoque"],
  jeep: ["jeep"],
  aston: ["aston", "martin"],
  mitsubishi: ["mitsubishi"],
  miusubishi: ["mitsubishi"],
  skoda: ["skoda", "škoda"],
  seat: ["seat"],
  peugeot: ["peugeot"],
  citroen: ["citroen", "citro"],
  renault: ["renault"],
  nissan: ["nissan"],
  honda: ["honda"],
  toyota: ["toyota"],
  ford: ["ford"],
  opel: ["opel"],
  fiat: ["fiat", "abarth"],
  abarth: ["abarth", "fiat"],
  audi: ["audi"],
  bmw: ["bmw"],
  porsche: ["porsche"],
  volvo: ["volvo"],
  hyundai: ["hyundai"],
  kia: ["kia"],
  dacia: ["dacia"],
  lexus: ["lexus"],
  infiniti: ["infiniti"],
  bentley: ["bentley"],
  alfa: ["alfa", "romeo"],
  byd: ["byd"],
  redbull: ["redbull", "red bull", "red bull"],
  corvette: ["corvette", "chevrolet"],
  panamera: ["porsche", "panamera"],
  boxster: ["porsche", "boxster"],
  rav4: ["toyota", "rav"],
  tourneo: ["ford", "tourneo"],
  transit: ["ford", "transit"],
  micra: ["nissan", "micra"],
  qashqai: ["nissan", "qashqai"],
  outlander: ["mitsubishi", "outlander"],
  miev: ["mitsubishi", "miev"],
  twingo: ["renault", "twingo"],
  twizy: ["renault", "twizy"],
  fluence: ["renault", "fluence"],
  sandero: ["dacia", "sandero"],
  polo: ["volkswagen", "vw", "polo"],
  jetta: ["volkswagen", "vw", "jetta"],
  cc: ["volkswagen", "vw"],
  scirocco: ["volkswagen", "vw"],
  caddy: ["volkswagen"],
  california: ["volkswagen", "california"],
  auris: ["toyota", "auris"],
  civic: ["honda", "civic"],
  crv: ["honda", "crv"],
  fiesta: ["ford", "fiesta"],
  focus: ["ford", "focus"],
  kuga: ["ford", "kuga"],
  citigo: ["skoda", "citigo"],
  fabia: ["skoda", "fabia"],
  octavia: ["skoda", "octavia"],
  superb: ["skoda", "superb"],
  rapid: ["skoda", "rapid"],
  ibiza: ["seat", "ibiza"],
  leon: ["seat", "leon"],
  glk: ["mercedes", "glk"],
  citan: ["mercedes", "citan"],
  wraith: ["rolls", "royce", "wraith"],
  x6: ["bmw", "x6"],
  rs6: ["audi", "rs6"],
  rs7: ["audi", "rs7"],
  s3: ["audi", "s3"],
  a6: ["audi", "a6"],
  a3: ["audi", "a3"],
  note: ["nissan", "note"],
  evalia: ["nissan", "evalia", "nv"],
  lv200: ["nissan"],
  pulsar: ["nissan"],
  cherokee: ["jeep", "cherokee"],
  grand: ["jeep", "grand"],
  panda: ["fiat", "panda"],
  500: ["fiat"],
  cooper: ["mini"],
  roadster: ["mini"],
  zafira: ["opel", "zafira"],
  astra: ["opel", "astra"],
  308: ["peugeot", "308"],
  2008: ["peugeot"],
  rcz: ["peugeot", "rcz"],
  c4: ["citroen", "c4"],
  c3: ["citroen", "c3"],
  c1: ["citroen", "c1"],
  elysee: ["citroen", "elysee", "c-elysee"],
  cactus: ["citroen", "cactus"],
  picasso: ["citroen", "picasso"],
  e6: ["byd"],
  v40: ["volvo", "v40"]
};

type GalleryLinksConfig = {
  sourcesRoot: string;
  extraSources?: Record<string, string>;
  skipFolders?: string[];
  galleries: Array<{ sourceFolder: string; outputSlug: string }>;
  articleToGallery: Record<string, string>;
};

type PhotoFolder = {
  fullPath: string;
  name: string;
  relFromMarcin: string;
  jpg: number;
  raw: number;
  norm: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function toOutputSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function isJpg(name: string): boolean {
  const l = name.toLowerCase();
  return l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".webp");
}

function isRaw(name: string): boolean {
  const l = name.toLowerCase();
  return l.endsWith(".cr2") || l.endsWith(".nef") || l.endsWith(".arw") || l.endsWith(".dng");
}

function shouldSkipDir(name: string, fullPath: string): boolean {
  const n = name.toLowerCase();
  if (SKIP_DIR_NAMES.has(n)) return true;
  const lower = fullPath.toLowerCase();
  return SKIP_PATH_PARTS.some((p) => lower.includes(p.replace(/\\/g, path.sep).toLowerCase()));
}

async function countInDir(dir: string): Promise<{ jpg: number; raw: number }> {
  let jpg = 0;
  let raw = 0;
  async function walk(d: string, depth: number) {
    if (depth > 3) return;
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full, depth + 1);
      else if (e.isFile()) {
        if (isJpg(e.name)) jpg += 1;
        else if (isRaw(e.name)) raw += 1;
      }
    }
  }
  await walk(dir, 0);
  return { jpg, raw };
}

async function discoverAllFolders(): Promise<PhotoFolder[]> {
  const results: PhotoFolder[] = [];
  const seen = new Set<string>();

  async function scanDir(dir: string, depth: number) {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const subdirs = entries.filter((e) => e.isDirectory() && !shouldSkipDir(e.name, path.join(dir, e.name)));

    const counts = await countInDir(dir);
    const folderName = path.basename(dir);
    const rel = path.relative(MARCIN_ROOT, dir);

    if (
      counts.jpg >= 3 &&
      dir !== MARCIN_ROOT &&
      !seen.has(dir) &&
      !shouldSkipDir(folderName, dir)
    ) {
      seen.add(dir);
      results.push({
        fullPath: dir,
        name: folderName,
        relFromMarcin: rel,
        jpg: counts.jpg,
        raw: counts.raw,
        norm: normalize(folderName + rel)
      });
    }

    for (const e of subdirs) {
      await scanDir(path.join(dir, e.name), depth + 1);
    }
  }

  if (!existsSync(MARCIN_ROOT)) {
    console.error("Brak", MARCIN_ROOT);
    return [];
  }
  await scanDir(MARCIN_ROOT, 0);
  return results.sort((a, b) => b.jpg - a.jpg);
}

function slugBrands(slug: string): Set<string> {
  const brands = new Set<string>();
  const parts = slug.split("-");
  for (let i = 0; i < parts.length; i++) {
    const one = parts[i];
    const two = parts.slice(i, i + 2).join("-");
    for (const key of [two, one]) {
      const aliases = BRAND_ALIASES[key];
      if (aliases) aliases.forEach((a) => brands.add(normalize(a)));
    }
  }
  const first = parts[0];
  if (first.length >= 3) brands.add(normalize(first));
  if (parts[0] === "pierwsza" && parts[1] === "jazda" && parts[2]) {
    const aliases = BRAND_ALIASES[parts[2]];
    if (aliases) aliases.forEach((a) => brands.add(normalize(a)));
  }
  if (parts[0] === "volkswagen" || slug.startsWith("vw-")) {
    brands.add("volkswagen");
    brands.add("vw");
  }
  return brands;
}

function articleTokens(slug: string, title: string): string[] {
  const raw = normalize(slug.replace(/-/g, " ") + title);
  return [...new Set(raw.match(/[a-z0-9]{3,}/g) ?? [])].filter(
    (t) => !["pierwsza", "jazda", "test", "nowy", "nowa", "nowe", "prezentacja", "porownanie"].includes(t)
  );
}

function folderHasBrand(folder: PhotoFolder, brands: Set<string>): boolean {
  if (brands.size === 0) return true;
  for (const b of brands) {
    if (b.length >= 3 && folder.norm.includes(b)) return true;
  }
  return false;
}

function scoreFolder(tokens: string[], folder: PhotoFolder, brands: Set<string>): number {
  if (!folderHasBrand(folder, brands)) return 0;
  let score = 0;
  let hits = 0;
  for (const tok of tokens) {
    if (folder.norm.includes(tok)) {
      hits += 1;
      score += tok.length >= 5 ? 4 : tok.length >= 4 ? 2 : 1;
    }
  }
  if (hits === 0) return 0;
  if (hits >= 2) score += 10;
  if (folder.jpg >= 8) score += 2;
  const folderNameNorm = normalize(folder.name);
  if (tokens.length > 0 && tokens.every((t) => folderNameNorm.includes(t))) score += 15;
  return score;
}

/** Jawne mapowania (ta sama marka / ten sam event) — bez proxy cross-brand. */
const MANUAL_MAPPINGS: Record<string, string> = {
  redbull: "D:\\MARCIN\\Artykuły\\redbull"
};

async function findArchives(): Promise<string[]> {
  const archives: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > 6) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !shouldSkipDir(e.name, full)) await walk(full, depth + 1);
      else if (e.isFile()) {
        const l = e.name.toLowerCase();
        if (l.endsWith(".rar") || l.endsWith(".zip")) archives.push(full);
      }
    }
  }
  await walk(MARCIN_ROOT, 0);
  return archives;
}

async function getNoDirSlugs(): Promise<Array<{ slug: string; title: string; brand?: string }>> {
  const manifest = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "src", "data", "galleries-manifest.json"), "utf8")
  ) as Record<string, unknown[]>;

  const files = (await fs.readdir(CONTENT_DIR)).filter(
    (f) => f.endsWith(".mdx") && f !== "README.md" && f !== "przykladowy-test.mdx"
  );
  const out: Array<{ slug: string; title: string; brand?: string }> = [];
  for (const f of files) {
    const slug = f.replace(/\.mdx$/, "");
    const { data } = matter(await fs.readFile(path.join(CONTENT_DIR, f), "utf8"));
    const gdir = data.galleryDir as string | undefined;
    if (gdir) {
      const gslug = gdir.replace(/^galleries[\\/]/, "").replace(/\\/g, "/");
      if (manifest[gslug]?.length) continue;
    }
    if (!gdir) {
      out.push({
        slug,
        title: String(data.title ?? slug),
        brand: data.brand as string | undefined
      });
    }
  }
  return out;
}

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

async function tryExtractArchive(archivePath: string): Promise<string | null> {
  const base = path.basename(archivePath, path.extname(archivePath));
  const dest = path.join(TMP_IMPORT, base);
  if (existsSync(dest)) {
    const { jpg } = await countInDir(dest);
    if (jpg >= 3) return dest;
  }
  await fs.mkdir(TMP_IMPORT, { recursive: true });
  const lower = archivePath.toLowerCase();
  try {
    if (lower.endsWith(".zip")) {
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force"`,
        { stdio: "pipe" }
      );
    } else if (lower.endsWith(".rar")) {
      const seven = "C:\\Program Files\\7-Zip\\7z.exe";
      if (!existsSync(seven)) return null;
      execSync(`"${seven}" x -y -o"${dest}" "${archivePath}"`, { stdio: "pipe" });
    }
    const { jpg } = await countInDir(dest);
    return jpg >= 3 ? dest : null;
  } catch {
    return null;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const extractArchives = process.argv.includes("--extract-archives");

  console.log("=== Deep discover D:\\MARCIN ===\n");
  const folders = await discoverAllFolders();
  console.log(`Foldery z ≥3 JPG/PNG (rekurencja, max depth ${MAX_DEPTH}): ${folders.length}\n`);

  const archives = await findArchives();
  console.log(`Archiwa .rar/.zip: ${archives.length}`);
  for (const a of archives.slice(0, 30)) console.log(`  ${a}`);
  if (archives.length > 30) console.log(`  ... +${archives.length - 30}`);

  const rawOnly: PhotoFolder[] = [];
  const jpgFolders: PhotoFolder[] = [];
  for (const f of folders) {
    if (f.jpg < 3 && f.raw >= 3) rawOnly.push(f);
    else if (f.jpg >= 3) jpgFolders.push(f);
  }

  const noDir = await getNoDirSlugs();
  console.log(`\nArtykuły NO_DIR: ${noDir.length}\n`);

  console.log(
    "\n(Uwaga: dopasowanie artykułów przeniesione do match-folders-to-articles.ts — uruchom: npx tsx scripts/match-folders-to-articles.ts)\n"
  );

  const MIN_SCORE = 5;
  const matches: Array<{
    slug: string;
    gallerySlug: string;
    folder: PhotoFolder;
    score: number;
  }> = [];

  for (const article of noDir) {
    const manualPath = MANUAL_MAPPINGS[article.slug];
    if (manualPath && existsSync(manualPath)) {
      const { jpg } = await countInDir(manualPath);
      if (jpg >= 3) {
        matches.push({
          slug: article.slug,
          gallerySlug: toOutputSlug(path.basename(manualPath)),
          folder: {
            fullPath: manualPath,
            name: path.basename(manualPath),
            relFromMarcin: path.relative(MARCIN_ROOT, manualPath),
            jpg,
            raw: 0,
            norm: normalize(path.basename(manualPath))
          },
          score: 100
        });
        continue;
      }
    }

    const brands = slugBrands(article.slug);
    if (article.brand) brands.add(normalize(article.brand));
    const tokens = articleTokens(article.slug, article.title);

    let best: PhotoFolder | null = null;
    let bestScore = 0;
    for (const folder of jpgFolders) {
      const s = scoreFolder(tokens, folder, brands);
      if (s > bestScore) {
        bestScore = s;
        best = folder;
      }
    }
    if (best && bestScore >= MIN_SCORE) {
      const gallerySlug = toOutputSlug(best.name);
      matches.push({ slug: article.slug, gallerySlug, folder: best, score: bestScore });
    }
  }

  console.log(`--- Dopasowania (legacy score≥${MIN_SCORE}) ---`);
  for (const m of matches.sort((a, b) => b.score - a.score)) {
    console.log(
      `${m.score.toString().padStart(3)} | ${m.slug} → ${m.gallerySlug}\n       ${m.folder.fullPath} (${m.folder.jpg} jpg)`
    );
  }

  const rawMatches: Array<{ slug: string; folder: PhotoFolder }> = [];
  for (const article of noDir) {
    const brands = slugBrands(article.slug);
    const tokens = articleTokens(article.slug, article.title);
    for (const folder of folders.filter((f) => f.raw >= 5 && f.jpg < 3)) {
      if (!folderHasBrand(folder, brands)) continue;
      const s = scoreFolder(tokens, folder, brands);
      if (s >= 6) rawMatches.push({ slug: article.slug, folder });
    }
  }

  if (rawMatches.length) {
    console.log("\n--- RAW-only (Lightroom export needed) ---");
    for (const r of rawMatches) {
      console.log(`  ${r.slug} ← ${r.folder.fullPath} (${r.folder.raw} RAW)`);
    }
  }

  const matchedSlugs = new Set(matches.map((m) => m.slug));
  console.log("\n--- Nadal bez dopasowania ---");
  for (const a of noDir.filter((x) => !matchedSlugs.has(x.slug))) {
    const brands = [...slugBrands(a.slug)];
    let hint = "";
    let bestH: PhotoFolder | null = null;
    let bestHs = 0;
    for (const folder of jpgFolders) {
      const s = scoreFolder(articleTokens(a.slug, a.title), folder, slugBrands(a.slug));
      if (s > bestHs) {
        bestHs = s;
        bestH = folder;
      }
    }
    if (bestH && bestHs > 0) hint = ` (najbl. ${bestHs}: ${bestH.relFromMarcin})`;
    console.log(`  ${a.slug} [${brands.join(",")}]${hint}`);
  }

  if (!apply) {
    console.log("\nUruchom z --apply aby zapisać dopasowania do gallery-links.json");
    return;
  }

  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as GalleryLinksConfig;
  const sourcesRootNorm = path.normalize(config.sourcesRoot);
  const existingSlugs = new Set([
    ...config.galleries.map((g) => g.outputSlug),
    ...Object.values(config.extraSources ?? {})
  ]);

  let newGalleries = 0;
  let newExtra = 0;
  let newLinks = 0;

  if (extractArchives) {
    for (const arch of archives.filter((a) => /california|scirocco|polo|focus/i.test(a))) {
      const extracted = await tryExtractArchive(arch);
      if (extracted) {
        console.log(`Rozpakowano: ${arch} → ${extracted}`);
        const { jpg } = await countInDir(extracted);
        const slug = toOutputSlug(path.basename(extracted));
        if (!existingSlugs.has(slug) && jpg >= 3) {
          config.extraSources = config.extraSources ?? {};
          config.extraSources[extracted] = slug;
          existingSlugs.add(slug);
          newExtra += 1;
        }
      }
    }
  }

  for (const m of matches) {
    if (config.articleToGallery[m.slug]) continue;

    let gSlug = m.gallerySlug;
    let n = 2;
    while (
      existingSlugs.has(gSlug) &&
      !config.galleries.some((g) => g.outputSlug === gSlug) &&
      !Object.values(config.extraSources ?? {}).includes(gSlug)
    ) {
      gSlug = `${m.gallerySlug}-${n}`;
      n += 1;
    }

    const srcNorm = path.normalize(m.folder.fullPath);
    const parent = path.dirname(srcNorm);
    const suroweRoot = path.join(sourcesRootNorm, "SUROWE");

    if (parent === sourcesRootNorm || parent === suroweRoot) {
      const folderName = path.basename(m.folder.fullPath);
      if (!config.galleries.some((g) => g.sourceFolder === folderName && g.outputSlug === gSlug)) {
        config.galleries.push({ sourceFolder: folderName, outputSlug: gSlug });
        newGalleries += 1;
      }
    } else {
      if (!Object.entries(config.extraSources ?? {}).some(([p]) => path.normalize(p) === srcNorm)) {
        config.extraSources = config.extraSources ?? {};
        config.extraSources[m.folder.fullPath] = gSlug;
        newExtra += 1;
      }
      gSlug =
        Object.entries(config.extraSources ?? {}).find(
          ([p]) => path.normalize(p) === srcNorm
        )?.[1] ?? gSlug;
    }
    existingSlugs.add(gSlug);
    config.articleToGallery[m.slug] = gSlug;
    newLinks += 1;

    const filePath = path.join(CONTENT_DIR, `${m.slug}.mdx`);
    if (existsSync(filePath)) {
      const raw = (await fs.readFile(filePath, "utf8")).replace(/\0/g, "");
      const { data, content } = matter(raw);
      if (data.galleryDir !== `galleries/${gSlug}`) {
        data.galleryDir = `galleries/${gSlug}`;
        await fs.writeFile(filePath, rewriteMdx(data, content), "utf8");
      }
    }
  }

  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
  console.log(`\nZapisano: +${newGalleries} galleries, +${newExtra} extraSources, +${newLinks} articleToGallery`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
