/**
 * Dopasowuje foldery JPG z D:\MARCIN do artykułów NO_DIR (scoring: slug + title + brand + model).
 * npx tsx scripts/match-folders-to-articles.ts [--apply] [--refresh-folders] [--min-score N]
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const MARCIN_ROOT = "D:\\MARCIN";
const CONFIG_PATH = path.join(process.cwd(), "scripts", "gallery-links.json");
const CONTENT_DIR = path.join(process.cwd(), "content", "testy");
const FOLDERS_CACHE = path.join(process.cwd(), "scripts", "data", "discovered-photo-folders.json");
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

const BRAND_CANON: Record<string, string> = {
  vw: "volkswagen",
  volkswagen: "volkswagen",
  mercedes: "mercedes",
  "mercedes-benz": "mercedes",
  mini: "mini",
  "rolls-royce": "rollsroyce",
  rolls: "rollsroyce",
  royce: "rollsroyce",
  "land-rover": "landrover",
  land: "landrover",
  range: "landrover",
  evoque: "landrover",
  aston: "astonmartin",
  martin: "astonmartin",
  "aston-martin": "astonmartin",
  alfa: "alfa",
  citroen: "citroen",
  citroën: "citroen",
  skoda: "skoda",
  škoda: "skoda",
  seat: "seat",
  peugeot: "peugeot",
  renault: "renault",
  nissan: "nissan",
  honda: "honda",
  toyota: "toyota",
  ford: "ford",
  opel: "opel",
  fiat: "fiat",
  abarth: "abarth",
  audi: "audi",
  bmw: "bmw",
  porsche: "porsche",
  volvo: "volvo",
  hyundai: "hyundai",
  kia: "kia",
  dacia: "dacia",
  lexus: "lexus",
  infiniti: "infiniti",
  bentley: "bentley",
  jeep: "jeep",
  mitsubishi: "mitsubishi",
  miusubishi: "mitsubishi",
  byd: "byd",
  corvette: "chevrolet",
  chevrolet: "chevrolet"
};

/** Model (slug token) → marka — gdy pierwsza-jazda-* nie zaczyna się od marki. */
const MODEL_TO_BRAND: Record<string, string> = {
  micra: "nissan",
  note: "nissan",
  pulsar: "nissan",
  qashqai: "nissan",
  evalia: "nissan",
  lv200: "nissan",
  outlander: "mitsubishi",
  miev: "mitsubishi",
  picasso: "citroen",
  cactus: "citroen",
  c1: "citroen",
  c4: "citroen",
  panamera: "porsche",
  boxster: "porsche",
  polo: "volkswagen",
  tourneo: "ford",
  rcz: "peugeot",
  rapid: "skoda",
  citigo: "skoda",
  fabia: "skoda",
  octavia: "skoda",
  ibiza: "seat",
  leon: "seat",
  auris: "toyota",
  rav4: "toyota",
  rav: "toyota",
  sandero: "dacia",
  fluence: "renault",
  twizy: "renault",
  twingo: "renault",
  wraith: "rollsroyce",
  scirocco: "volkswagen",
  jetta: "volkswagen",
  cc: "volkswagen",
  v40: "volvo",
  glk: "mercedes",
  citan: "mercedes",
  rs6: "audi",
  rs7: "audi",
  s3: "audi",
  a6: "audi",
  astra: "opel",
  zafira: "opel",
  fiesta: "ford",
  focus: "ford",
  kuga: "ford",
  civic: "honda",
  crv: "honda",
  cherokee: "jeep",
  cooper: "mini",
  roadster: "mini"
};

const PARENT_JUNK_NAMES = new Set([
  "galerie z testów",
  "z pulpitu",
  "zdjęcia - zlecenia",
  "testy",
  "karta 23.08.15 backup",
  "i drive cars",
  "foty do obróbki - marcina",
  "artykuły",
  "zdjęcia",
  "2015",
  "2016",
  "2017",
  "dysk google",
  "marcin"
]);

const MODEL_ALIASES: Record<string, string[]> = {
  celysee: ["elysee", "celysee", "celysee"],
  "c-elysee": ["elysee", "celysee"],
  rav4: ["rav4", "rav"],
  "i-miev": ["miev", "imiev"],
  miev: ["miev", "imiev"],
  tourneo: ["tourneo", "transit"],
  "grand-cherokee": ["cherokee", "grandcherokee"],
  cherokee: ["cherokee"],
  panamera: ["panamera"],
  boxster: ["boxster", "cayman"],
  scirocco: ["scirocco"],
  jetta: ["jetta"],
  cc: ["passatcc", "cc"],
  fabia: ["fabia"],
  citigo: ["citigo"],
  rapid: ["rapid", "spaceback"],
  octavia: ["octavia"],
  superb: ["superb"],
  ibiza: ["ibiza"],
  leon: ["leon"],
  micra: ["micra"],
  note: ["note"],
  pulsar: ["pulsar"],
  qashqai: ["qashqai"],
  outlander: ["outlander"],
  astra: ["astra"],
  zafira: ["zafira"],
  sandero: ["sandero"],
  fluence: ["fluence"],
  twizy: ["twizy"],
  twingo: ["twingo"],
  auris: ["auris"],
  fiesta: ["fiesta"],
  focus: ["focus"],
  kuga: ["kuga"],
  civic: ["civic"],
  crv: ["crv", "crv"],
  picasso: ["picasso"],
  cactus: ["cactus"],
  wraith: ["wraith"],
  v40: ["v40"],
  glk: ["glk"],
  citan: ["citan"],
  rs6: ["rs6"],
  rs7: ["rs7"],
  rcz: ["rcz"],
  s3: ["s3"],
  a6: ["a6"],
  allroad: ["allroad", "a6allroad"],
  x6: ["x6"],
  evalia: ["evalia", "nv200", "lv200"],
  lv200: ["lv200", "evalia", "nv200"],
  roadster: ["roadster", "cooper"],
  cooper: ["cooper", "mini"],
  giulietta: ["giulietta", "giulia"],
  giulia: ["giulia", "giulietta"]
};

type GalleryLinksConfig = {
  sourcesRoot: string;
  extraSources?: Record<string, string>;
  manualFolderMatches?: Record<string, string>;
  skipFolders?: string[];
  galleries: Array<{ sourceFolder: string; outputSlug: string }>;
  articleToGallery: Record<string, string>;
};

type PhotoFolder = {
  fullPath: string;
  name: string;
  relFromMarcin: string;
  jpg: number;
  norm: string;
  nameNorm: string;
};

type ArticleRow = {
  slug: string;
  title: string;
  brand?: string;
  model?: string;
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

function shouldSkipDir(name: string, fullPath: string): boolean {
  const n = name.toLowerCase();
  if (SKIP_DIR_NAMES.has(n)) return true;
  const lower = fullPath.toLowerCase();
  return SKIP_PATH_PARTS.some((p) => lower.includes(p.replace(/\\/g, path.sep).toLowerCase()));
}

async function countInDir(dir: string): Promise<number> {
  let jpg = 0;
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
      else if (e.isFile() && isJpg(e.name)) jpg += 1;
    }
  }
  await walk(dir, 0);
  return jpg;
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

    const subdirs = entries.filter(
      (e) => e.isDirectory() && !shouldSkipDir(e.name, path.join(dir, e.name))
    );

    const jpg = await countInDir(dir);
    const folderName = path.basename(dir);
    const rel = path.relative(MARCIN_ROOT, dir);

    const isParentJunk =
      PARENT_JUNK_NAMES.has(folderName.toLowerCase()) && jpg > 150 && subdirs.length > 2;

    if (
      jpg >= 3 &&
      dir !== MARCIN_ROOT &&
      !seen.has(dir) &&
      !shouldSkipDir(folderName, dir) &&
      !isParentJunk
    ) {
      seen.add(dir);
      results.push({
        fullPath: dir,
        name: folderName,
        relFromMarcin: rel,
        jpg,
        norm: normalize(folderName + rel),
        nameNorm: normalize(folderName)
      });
    }

    for (const e of subdirs) {
      await scanDir(path.join(dir, e.name), depth + 1);
    }
  }

  if (!existsSync(MARCIN_ROOT)) return [];
  await scanDir(MARCIN_ROOT, 0);
  return results.sort((a, b) => b.jpg - a.jpg);
}

function canonBrand(raw?: string): string {
  if (!raw) return "";
  const n = normalize(raw);
  if (n === "pierwsza" || n === "jazda" || n === "prezentacja" || n === "porownanie") return "";
  return BRAND_CANON[n] ?? n;
}

function brandFromTitleModel(title: string, model?: string): string {
  const n = normalize(`${title} ${model ?? ""}`);
  for (const [key, canon] of Object.entries(BRAND_CANON)) {
    if (key.length >= 4 && n.includes(normalize(key))) return canon;
  }
  for (const [modelKey, brand] of Object.entries(MODEL_TO_BRAND)) {
    if (n.includes(modelKey)) return brand;
  }
  return "";
}

function effectiveBrand(article: ArticleRow): string {
  return (
    canonBrand(article.brand) ||
    detectBrandFromSlug(article.slug) ||
    brandFromTitleModel(article.title, article.model)
  );
}

function detectBrandFromSlug(slug: string): string {
  const parts = slug.split("-");
  if (slug.includes("rav4") || slug.includes("rav-4")) return "toyota";
  if (parts[0] === "pierwsza" && parts[1] === "jazda") {
    for (const p of parts.slice(2)) {
      if (BRAND_CANON[p]) return BRAND_CANON[p];
      const fromModel = MODEL_TO_BRAND[p];
      if (fromModel) return fromModel;
    }
    if (parts[2] === "miusubishi") return "mitsubishi";
    if (parts[2] === "citroen") return "citroen";
    if (parts[2] === "jeep") return "jeep";
    if (parts[2] === "porsche") return "porsche";
  }
  if (parts[0] === "prezentacja" && parts[1] === "scirocco") return "volkswagen";
  if (parts[0] === "porownanie") {
    for (const p of parts.slice(1)) {
      if (MODEL_TO_BRAND[p]) return MODEL_TO_BRAND[p];
    }
  }
  if (parts[0] === "vw" || parts[0] === "volkswagen") return "volkswagen";
  if (parts[0] === "rolls" && parts[1] === "royce") return "rollsroyce";
  if (parts[0] === "aston" && parts[1] === "martin") return "astonmartin";
  if (parts[0] === "alfa" && parts[1] === "romeo") return "alfa";
  if (parts[0] === "land" && parts[1] === "rover") return "landrover";
  if (parts[0] === "mercedes") return "mercedes";
  if (parts[0] === "mitsubishi" || parts[0] === "miusubishi") return "mitsubishi";
  return canonBrand(parts[0]);
}

function modelTokens(slug: string, model?: string): string[] {
  const tokens = new Set<string>();
  const add = (t: string) => {
    const n = normalize(t);
    if (n.length >= 2) tokens.add(n);
    const aliases = MODEL_ALIASES[n];
    if (aliases) aliases.forEach((a) => tokens.add(normalize(a)));
  };

  if (model) add(model);

  const parts = slug.split("-").filter(Boolean);
  let start = 0;
  if (parts[0] === "pierwsza" && parts[1] === "jazda") start = 2;
  else if (parts[0] === "vw") start = 1;
  else if (
    (parts[0] === "rolls" && parts[1] === "royce") ||
    (parts[0] === "aston" && parts[1] === "martin") ||
    (parts[0] === "alfa" && parts[1] === "romeo") ||
    (parts[0] === "land" && parts[1] === "rover")
  ) {
    start = 2;
  } else if (parts[0] === "mercedes" || parts[0] === "volkswagen") start = 1;

  const stop = new Set([
    "pierwsza",
    "jazda",
    "test",
    "nowy",
    "nowa",
    "nowe",
    "prezentacja",
    "porownanie",
    "vs",
    "dane",
    "techniczne",
    "marzenia",
    "ziemii",
    "bardziej",
    "grand",
    "chce",
    "wiecej",
    "więcej",
    "executive",
    "lwb",
    "turbo",
    "diesel",
    "hybrid",
    "sport",
    "kombi",
    "ecoboost",
    "tdi",
    "hdi",
    "tce",
    "tsi",
    "mpi",
    "cdi",
    "dig",
    "seduction",
    "laureate",
    "ecomotive",
    "prestige",
    "design",
    "concept",
    "convertible",
    "motorsport",
    "jastarnia",
    "ciasna",
    "konkurencja",
    "spaceback",
    "sportback",
    "quattro",
    "allroad",
    "facelifting",
    "new",
    "fl",
    "ze",
    "phev",
    "ze",
    "gtc",
    "tourer",
    "fr",
    "abc",
    "elegance",
    "r",
    "line",
    "inclusive",
    "all",
    "track",
    "on",
    "rauno",
    "aaltonen",
    "by",
    "gucci",
    "pop",
    "star",
    "16v",
    "16",
    "20",
    "12",
    "10",
    "09",
    "30",
    "36",
    "v6",
    "v8",
    "vii",
    "golf",
    "passat"
  ]);

  for (let i = start; i < parts.length; i++) {
    const p = parts[i];
    if (stop.has(p)) continue;
    if (p.length >= 2 && !BRAND_CANON[p]) add(p);
    if (i + 1 < parts.length) {
      const pair = `${parts[i]}-${parts[i + 1]}`;
      if (MODEL_ALIASES[pair]) {
        MODEL_ALIASES[pair].forEach((a) => add(a));
        i += 1;
      }
    }
  }

  return [...tokens].filter((t) => t.length >= 2);
}

function articleTokens(slug: string, title: string, brand?: string, model?: string): string[] {
  const tokens = new Set<string>();
  const raw = normalize(`${slug.replace(/-/g, " ")} ${title} ${brand ?? ""} ${model ?? ""}`);
  for (const m of raw.match(/[a-z0-9]{3,}/g) ?? []) {
    if (!["pierwsza", "jazda", "test", "prezentacja", "porownanie"].includes(m)) tokens.add(m);
  }
  for (const t of modelTokens(slug, model)) tokens.add(t);
  if (slug.startsWith("pierwsza-jazda")) {
    tokens.add("pierwszajazda");
    tokens.add("pierwsza");
    tokens.add("jazda");
  }
  return [...tokens];
}

function folderBrand(folder: PhotoFolder): string {
  const n = folder.nameNorm;
  if (n.startsWith("miniatur")) return "peugeot";
  if (n.includes("minicooper") || (n.startsWith("mini") && !n.startsWith("miniatur"))) return "mini";
  for (const [key, canon] of Object.entries(BRAND_CANON)) {
    if (key.length >= 4 && n.includes(normalize(key))) return canon;
  }
  for (const canon of new Set(Object.values(BRAND_CANON))) {
    if (canon.length >= 4 && n.includes(canon)) return canon;
  }
  return "";
}

function brandsCompatible(articleBrand: string, folder: PhotoFolder): boolean {
  if (!articleBrand) return true;
  const fb = folderBrand(folder);
  if (!fb) return false;
  if (articleBrand === fb) return true;
  if (articleBrand === "volkswagen" && (fb === "volkswagen" || folder.norm.includes("vw")))
    return true;
  if (articleBrand === "rollsroyce" && (fb === "rollsroyce" || folder.norm.includes("wraith")))
    return true;
  if (articleBrand === "landrover" && (fb === "landrover" || folder.norm.includes("evoque")))
    return true;
  if (articleBrand === "astonmartin" && fb === "astonmartin") return true;
  if (articleBrand === "alfa" && (fb === "alfa" || folder.norm.includes("giulia"))) return true;
  return false;
}

function conflictingModels(modelToks: string[], folder: PhotoFolder): boolean {
  if (modelToks.length === 0) return false;
  const fn = folder.nameNorm;
  const pairs: [string, string][] = [
    ["fiesta", "focus"],
    ["micra", "pulsar"],
    ["micra", "note"],
    ["note", "pulsar"],
    ["note", "micra"],
    ["pulsar", "micra"],
    ["tourneo", "focus"],
    ["focus", "tourneo"],
    ["tourneo", "fiesta"],
    ["focus", "fiesta"],
    ["kuga", "fiesta"],
    ["octavia", "fabia"],
    ["fabia", "octavia"],
    ["golf", "polo"],
    ["polo", "golf"],
    ["cactus", "picasso"],
    ["picasso", "cactus"],
    ["c1", "c4"],
    ["ibiza", "leon"],
    ["leon", "ibiza"],
    ["rav4", "auris"],
    ["auris", "rav4"],
    ["jetta", "passat"],
    ["cc", "passat"],
    ["scirocco", "golf"],
    ["boxster", "panamera"],
    ["panamera", "boxster"],
    ["outlander", "miev"],
    ["miev", "outlander"],
    ["sandero", "logan"],
    ["fluence", "twingo"],
    ["twingo", "twizy"],
    ["twizy", "twingo"],
    ["astra", "zafira"],
    ["zafira", "astra"],
    ["rs6", "rs7"],
    ["rs7", "rs6"],
    ["s3", "a6"],
    ["a6", "s3"],
    ["x6", "x5"],
    ["glk", "citan"],
    ["citan", "glk"]
  ];
  for (const need of modelToks) {
    if (!fn.includes(need)) continue;
    for (const [a, b] of pairs) {
      if (need === a && fn.includes(b)) return true;
      if (need === b && fn.includes(a)) return true;
    }
  }
  return false;
}

function scoreFolder(
  article: ArticleRow,
  folder: PhotoFolder,
  tokens: string[],
  modelToks: string[],
  articleBrand: string
): number {
  if (!brandsCompatible(articleBrand, folder)) return 0;
  if (conflictingModels(modelToks, folder)) return 0;

  let score = 0;
  let modelHits = 0;
  let otherHits = 0;

  for (const tok of modelToks) {
    if (folder.norm.includes(tok) || folder.nameNorm.includes(tok)) {
      modelHits += 1;
      score += tok.length >= 5 ? 12 : 8;
    }
  }

  for (const tok of tokens) {
    if (modelToks.includes(tok)) continue;
    if (folder.norm.includes(tok)) {
      otherHits += 1;
      score += tok.length >= 5 ? 3 : 1;
    }
  }

  if (article.slug.startsWith("pierwsza-jazda")) {
    const isPjFolder =
      folder.norm.includes("pierwszajazda") ||
      folder.name.toLowerCase().includes("pierwsza jazda");
    if (!isPjFolder) return 0;
    score += 15;
    if (modelToks.length > 0) {
      const modelInFolderName = modelToks.some(
        (t) => t.length >= 4 && folder.nameNorm.includes(t)
      );
      if (!modelInFolderName) return 0;
    }
  } else if (modelToks.length > 0 && modelHits === 0) {
    return 0;
  }

  if (modelHits >= 2) score += 10;
  if (modelHits >= 1 && otherHits >= 1) score += 5;
  if (folder.jpg >= 10) score += 3;
  if (folder.jpg >= 25) score += 2;

  const slugNorm = normalize(article.slug);
  if (folder.nameNorm.length >= 6 && (slugNorm.includes(folder.nameNorm) || folder.nameNorm.includes(slugNorm.slice(0, 12)))) {
    score += 20;
  }

  return score;
}

async function getNoDirArticles(): Promise<ArticleRow[]> {
  const files = (await fs.readdir(CONTENT_DIR)).filter(
    (f) => f.endsWith(".mdx") && f !== "README.md" && f !== "przykladowy-test.mdx"
  );
  const out: ArticleRow[] = [];
  for (const f of files) {
    const slug = f.replace(/\.mdx$/, "");
    const { data } = matter(await fs.readFile(path.join(CONTENT_DIR, f), "utf8"));
    if (data.galleryDir) continue;
    out.push({
      slug,
      title: String(data.title ?? slug),
      brand: data.brand as string | undefined,
      model: data.model as string | undefined
    });
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

function resolveGallerySlug(
  folderPath: string,
  proposed: string,
  config: GalleryLinksConfig
): string {
  const normPath = path.normalize(folderPath);
  const fromExtra = Object.entries(config.extraSources ?? {}).find(
    ([p]) => path.normalize(p) === normPath
  );
  if (fromExtra) return fromExtra[1];

  const folderName = path.basename(folderPath);
  const fromGal = config.galleries.find((g) => g.sourceFolder === folderName);
  if (fromGal) return fromGal.outputSlug;

  const fromArticle = Object.entries(config.articleToGallery).find(([, g]) => g === proposed);
  if (fromArticle) return proposed;

  return proposed;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const refresh = process.argv.includes("--refresh-folders");
  const minScoreArg = process.argv.find((a) => a.startsWith("--min-score="));
  const MIN_SCORE = minScoreArg ? Number(minScoreArg.split("=")[1]) : 10;

  let folders: PhotoFolder[];
  if (!refresh && existsSync(FOLDERS_CACHE)) {
    folders = JSON.parse(await fs.readFile(FOLDERS_CACHE, "utf8")) as PhotoFolder[];
    console.log(`Wczytano cache: ${folders.length} folderów (${FOLDERS_CACHE})\n`);
  } else {
    console.log("Skan D:\\MARCIN…");
    folders = await discoverAllFolders();
    await fs.mkdir(path.dirname(FOLDERS_CACHE), { recursive: true });
    await fs.writeFile(FOLDERS_CACHE, JSON.stringify(folders, null, 2), "utf8");
    console.log(`Zapisano ${folders.length} folderów do cache.\n`);
  }

  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8")) as GalleryLinksConfig;
  const manual = config.manualFolderMatches ?? {};
  /** Ręczne obniżenie progu JPG (np. folder z 2 zdjęciami). */
  const manualMinJpg: Record<string, number> = {
    "evoque-convertible-concept": 2
  };
  const articles = await getNoDirArticles();
  const usedFolders = new Set<string>();

  console.log(`Artykuły NO_DIR: ${articles.length}`);
  console.log(`Foldery JPG≥3: ${folders.length}`);
  console.log(`Próg score: ${MIN_SCORE}\n`);

  const matches: Array<{
    slug: string;
    gallerySlug: string;
    folder: PhotoFolder;
    score: number;
    manual: boolean;
  }> = [];

  for (const article of articles) {
    const manualPath = manual[article.slug];
    if (manualPath && existsSync(manualPath)) {
      const jpg = await countInDir(manualPath);
      const minJpg = manualMinJpg[article.slug] ?? 3;
      if (jpg >= minJpg) {
        matches.push({
          slug: article.slug,
          gallerySlug: toOutputSlug(path.basename(manualPath)),
          folder: {
            fullPath: manualPath,
            name: path.basename(manualPath),
            relFromMarcin: path.relative(MARCIN_ROOT, manualPath),
            jpg,
            norm: normalize(path.basename(manualPath)),
            nameNorm: normalize(path.basename(manualPath))
          },
          score: 200,
          manual: true
        });
        usedFolders.add(path.normalize(manualPath));
        continue;
      }
    }

    const articleBrand = effectiveBrand(article);
    const modelToks = modelTokens(article.slug, article.model);
    const tokens = articleTokens(article.slug, article.title, article.brand, article.model);

    let best: PhotoFolder | null = null;
    let bestScore = 0;
    for (const folder of folders) {
      const s = scoreFolder(article, folder, tokens, modelToks, articleBrand);
      if (s > bestScore) {
        bestScore = s;
        best = folder;
      }
    }
    if (best && bestScore >= MIN_SCORE) {
      const proposed = toOutputSlug(best.name);
      const gallerySlug = resolveGallerySlug(best.fullPath, proposed, config);
      matches.push({
        slug: article.slug,
        gallerySlug,
        folder: best,
        score: bestScore,
        manual: false
      });
      usedFolders.add(path.normalize(best.fullPath));
    }
  }

  console.log("=== NOWE DOPASOWANIA ===\n");
  for (const m of matches.sort((a, b) => b.score - a.score)) {
    console.log(
      `${m.manual ? "MAN" : m.score.toString().padStart(3)} | ${m.slug}\n      → ${m.folder.fullPath}\n      (${m.folder.jpg} JPG, slug: ${m.gallerySlug})`
    );
  }

  const matchedSlugs = new Set(matches.map((m) => m.slug));
  console.log("\n=== NADAL NO_DIR (brak folderu / score) ===\n");
  for (const a of articles.filter((x) => !matchedSlugs.has(x.slug))) {
    const articleBrand = effectiveBrand(a);
    const modelToks = modelTokens(a.slug, a.model);
    let hint = "";
    let bestH: PhotoFolder | null = null;
    let bestHs = 0;
    for (const folder of folders) {
      const s = scoreFolder(
        a,
        folder,
        articleTokens(a.slug, a.title, a.brand, a.model),
        modelToks,
        articleBrand
      );
      if (s > bestHs) {
        bestHs = s;
        bestH = folder;
      }
    }
    if (bestH && bestHs > 0) hint = ` [najbl. ${bestHs}: ${bestH.name}]`;
    const brandLabel = effectiveBrand(a) || "?";
    console.log(`  ${a.slug} (${brandLabel})${hint}`);
  }

  const linkedPaths = new Set(
    Object.keys(config.extraSources ?? {}).map((p) => path.normalize(p))
  );
  for (const g of config.galleries) {
    linkedPaths.add(path.normalize(path.join(config.sourcesRoot, g.sourceFolder)));
  }
  const orphans = folders.filter(
    (f) => !usedFolders.has(path.normalize(f.fullPath)) && !linkedPaths.has(path.normalize(f.fullPath))
  );
  console.log(`\n=== ORPHAN FOLDERY (bez artykułu, próbka 40/${orphans.length}) ===\n`);
  for (const o of orphans.slice(0, 40)) {
    console.log(`  ${o.jpg} | ${o.relFromMarcin}`);
  }

  if (!apply) {
    console.log(`\nUruchom z --apply aby zapisać ${matches.length} dopasowań.`);
    return;
  }

  const existingSlugs = new Set([
    ...config.galleries.map((g) => g.outputSlug),
    ...Object.values(config.extraSources ?? {}),
    ...Object.values(config.articleToGallery)
  ]);

  const sourcesRootNorm = path.normalize(config.sourcesRoot);
  const suroweRoot = path.join(sourcesRootNorm, "SUROWE");
  let newGalleries = 0;
  let newExtra = 0;
  let newLinks = 0;

  for (const m of matches) {
    if (config.articleToGallery[m.slug]) continue;

    let gSlug = resolveGallerySlug(m.folder.fullPath, m.gallerySlug, config);
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

    if (parent === sourcesRootNorm || parent === suroweRoot) {
      const folderName = path.basename(m.folder.fullPath);
      if (!config.galleries.some((g) => g.sourceFolder === folderName && g.outputSlug === gSlug)) {
        config.galleries.push({ sourceFolder: folderName, outputSlug: gSlug });
        newGalleries += 1;
      }
    } else {
      const existing = Object.entries(config.extraSources ?? {}).find(
        ([p]) => path.normalize(p) === srcNorm
      );
      if (!existing) {
        config.extraSources = config.extraSources ?? {};
        config.extraSources[m.folder.fullPath] = gSlug;
        newExtra += 1;
      } else {
        gSlug = existing[1];
      }
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
  console.log(`\nZapisano: +${newGalleries} galleries, +${newExtra} extraSources, +${newLinks} linków.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
