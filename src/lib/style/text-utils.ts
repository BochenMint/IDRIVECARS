/** Normalizacja tekstu do analizy i anty-plagiatu. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[YouTube\]\([^)]*\)/gi, "")
    .replace(/\\([+\\-])/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function wordCount(text: string): number {
  const t = normalizeText(text);
  if (!t) return 0;
  return t.split(" ").filter(Boolean).length;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

export function extractBoldHeadings(md: string): string[] {
  const headings: string[] = [];
  for (const m of md.matchAll(/\*\*([^*\n]{3,80})\*\*/g)) {
    const t = m[1].trim();
    if (/^(zalety|wady|podsumowanie)\s*:?$/i.test(t)) continue;
    if (t.length < 4) continue;
    headings.push(t);
  }
  return headings;
}

export function takeExcerpts(plain: string): { opening: string; middle: string; closing: string } {
  const paras = plain.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 40);
  if (!paras.length) {
    const s = plain.slice(0, 400);
    return { opening: s, middle: "", closing: "" };
  }
  const opening = paras[0].slice(0, 500);
  const middle = paras[Math.floor(paras.length / 2)]?.slice(0, 400) ?? "";
  const closing = paras[paras.length - 1].slice(0, 400);
  return { opening, middle, closing };
}

export function buildShingles(text: string, size = 5): Set<string> {
  const words = normalizeText(text).split(" ").filter(Boolean);
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) {
    shingles.add(words.slice(i, i + size).join(" "));
  }
  return shingles;
}

const KNOWN_BRANDS = [
  "bmw",
  "mercedes",
  "mercedes-benz",
  "audi",
  "porsche",
  "volkswagen",
  "vw",
  "ford",
  "toyota",
  "lexus",
  "honda",
  "mazda",
  "skoda",
  "citroen",
  "renault",
  "peugeot",
  "volvo",
  "jaguar",
  "land rover",
  "bentley",
  "rolls-royce",
  "rolls royce",
  "maserati",
  "ferrari",
  "lamborghini",
  "mclaren",
  "koenigsegg",
  "aston martin",
  "alfa romeo",
  "fiat",
  "mini",
  "opel",
  "nissan",
  "hyundai",
  "kia",
  "subaru",
  "mitsubishi",
  "brabus",
  "amg"
];

export function extractBrandsFromText(...parts: string[]): string[] {
  const hay = normalizeText(parts.join(" "));
  const found = new Set<string>();
  for (const brand of KNOWN_BRANDS) {
    if (hay.includes(brand)) {
      found.add(brand.replace(/\s+/g, "-"));
    }
  }
  return [...found];
}

export function tokenizeForMatch(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((w) => w.length > 2);
}
