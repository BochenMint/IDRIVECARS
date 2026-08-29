/**
 * Heurystyka języka polskiego dla guardraili news AI.
 * Wyklucza z licznika ratio nazwy własne i skróty branżowe (eVTOL, FAA, NYSE…),
 * ale nadal łapie angielski bełkot (EN stopwords).
 */

const POLISH_MARKERS = [
  "jest",
  "oraz",
  "ktory",
  "ktora",
  "ktore",
  "samochod",
  "auto",
  "marka",
  "model",
  "silnik",
  "zostal",
  "zostanie",
  "wedlug",
  "ponadto",
  "natomiast",
  "jednak",
  "rowniez",
  "przez",
  "moze",
  "bedzie",
  "nowy",
  "nowa",
  "nowe",
  "wedle",
  "zgodnie",
  "producent",
  "premiera",
  "wedlug",
  "tym",
  "oraz",
  "czy",
  "jak",
  "dla",
  "ze",
  "na",
  "do",
  "po",
  "od",
  "przy",
  "bez",
  "pod",
  "nad",
  "miedzy",
  "miedzy",
  "ktorego",
  "ktorej",
  "ktorych",
  "będzie",
  "będą",
  "mają",
  "maja",
  "ma",
  "sa",
  "są",
  "byl",
  "byla",
  "bylo",
  "byli",
  "były",
  "byly",
  "takze",
  "również",
  "rowniez",
  "najpierw",
  "nastepnie",
  "następnie",
  "według",
  "zgodnie",
  "chodzi",
  "oznacza",
  "oznacza",
  "wedle",
  "wedlug",
  "komunikat",
  "według",
  "wedlug"
];

/** Skróty i terminy techniczne — nie obniżają ratio polszczyzny. */
const TECH_WHITELIST = new Set(
  [
    "evtol",
    "faa",
    "nyse",
    "suv",
    "ev",
    "ice",
    "v8",
    "v6",
    "v12",
    "wltp",
    "awd",
    "rwd",
    "fwd",
    "phev",
    "bev",
    "hev",
    "mpg",
    "bhp",
    "ps",
    "nm",
    "kw",
    "hp",
    "gps",
    "abs",
    "esp",
    "dsg",
    "pdk",
    "cvt",
    "at",
    "mt",
    "oem",
    "ceo",
    "cfo",
    "ipo",
    "usd",
    "eur",
    "gbp",
    "pln",
    "ai",
    "rss",
    "api",
    "html",
    "json",
    "url",
    "http",
    "https",
    "www",
    "com",
    "inc",
    "corp",
    "ltd",
    "gmbh",
    "ag",
    "sa",
    "plc",
    "llc",
    "jv",
    "ev",
    "ice",
    "r4",
    "i4",
    "i6",
    "i8",
    "x5",
    "x6",
    "gt",
    "gti",
    "gts",
    "amg",
    "rs",
    "tdi",
    "tsi",
    "hdi",
    "quattro",
    "4matic",
    "xdrive",
    "joby",
    "toyota",
    "bmw",
    "mercedes",
    "audi",
    "porsche",
    "ford",
    "honda",
    "nissan",
    "lexus",
    "volkswagen",
    "vw",
    "hyundai",
    "kia",
    "mazda",
    "volvo",
    "jaguar",
    "bentley",
    "ferrari",
    "lamborghini",
    "mclaren",
    "koenigsegg",
    "aston",
    "martin",
    "alfa",
    "romeo",
    "fiat",
    "opel",
    "skoda",
    "renault",
    "peugeot",
    "citroen",
    "subaru",
    "mitsubishi",
    "tesla",
    "rivian",
    "lucid",
    "nio",
    "byd",
    "geely",
    "calif",
    "japan",
    "usa",
    "uk",
    "eu",
    "de",
    "jp",
    "kr",
    "cn"
  ].map((w) => w.toLowerCase())
);

const EN_STOPWORDS = new Set(
  [
    "the",
    "and",
    "with",
    "will",
    "have",
    "has",
    "had",
    "this",
    "that",
    "from",
    "their",
    "they",
    "them",
    "which",
    "would",
    "could",
    "should",
    "been",
    "were",
    "being",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "both",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "only",
    "own",
    "same",
    "than",
    "too",
    "very",
    "can",
    "just",
    "also",
    "now",
    "our",
    "your",
    "his",
    "her",
    "its",
    "not",
    "but",
    "for",
    "are",
    "was",
    "were",
    "you",
    "she",
    "him",
    "who",
    "what",
    "these",
    "those",
    "because",
    "while",
    "although",
    "however",
    "therefore",
    "announced",
    "today",
    "company",
    "corporation",
    "according",
    "said",
    "says",
    "new",
    "first",
    "last",
    "year",
    "years",
    "month",
    "months",
    "week",
    "world",
    "global",
    "market",
    "vehicle",
    "vehicles",
    "car",
    "cars",
    "electric",
    "hybrid",
    "engine",
    "motor",
    "production",
    "manufacturing",
    "alliance",
    "joint",
    "venture",
    "strategic",
    "phase",
    "initial",
    "launch",
    "realize",
    "mobility",
    "aviation",
    "excellence",
    "recognized",
    "expertise",
    "systems",
    "operational",
    "combining",
    "pioneering",
    "work",
    "establishing",
    "appeared",
    "post",
    "newsroom"
  ].map((w) => w.toLowerCase())
);

function normalizeForTokens(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Słowa z wielkiej litery lub akronimy w oryginale — proper nouns. */
function extractProperNounTokens(original: string): Set<string> {
  const found = new Set<string>();
  for (const m of original.matchAll(/\b([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{1,}(?:[''][a-z]+)?)\b/g)) {
    found.add(normalizeForTokens(m[1]));
  }
  for (const m of original.matchAll(/\b([A-ZĄĆĘŁŃÓŚŹŻ]{2,})\b/g)) {
    found.add(normalizeForTokens(m[1]));
  }
  for (const m of original.matchAll(/\b([a-z]+[0-9][a-z0-9]*|[0-9]+[a-z]+)\b/gi)) {
    found.add(normalizeForTokens(m[1]));
  }
  return found;
}

function isExemptToken(token: string, properNouns: Set<string>): boolean {
  if (!token || token.length < 2) return true;
  if (/^\d+$/.test(token)) return true;
  if (TECH_WHITELIST.has(token)) return true;
  if (properNouns.has(token)) return true;
  if (/^[a-z]*\d+[a-z0-9]*$/.test(token)) return true;
  if (/^\d+[a-z][a-z0-9]*$/.test(token)) return true;
  return false;
}

export type PolishLanguageResult = {
  ok: boolean;
  ratio: number;
  enRatio: number;
  markerHits: number;
  scorableTokens: number;
  exemptTokens: number;
  reason?: string;
};

const MIN_MARKERS = 4;
const MIN_RATIO = 0.03;
const MAX_EN_RATIO = 0.12;
const MIN_SCORABLE = 8;

export function checkPolishLanguage(text: string): PolishLanguageResult {
  const tokens = normalizeForTokens(text).split(" ").filter(Boolean);
  if (tokens.length < 20) {
    return {
      ok: false,
      ratio: 0,
      enRatio: 0,
      markerHits: 0,
      scorableTokens: 0,
      exemptTokens: 0,
      reason: "za krótki tekst (< 20 tokenów)"
    };
  }

  const properNouns = extractProperNounTokens(text);
  let markerHits = 0;
  let enHits = 0;
  let scorable = 0;
  let exempt = 0;

  for (const t of tokens) {
    if (isExemptToken(t, properNouns)) {
      exempt++;
      continue;
    }
    scorable++;
    if (POLISH_MARKERS.includes(t)) markerHits++;
    if (EN_STOPWORDS.has(t)) enHits++;
  }

  const ratio = scorable > 0 ? markerHits / scorable : 0;
  const enRatio = scorable > 0 ? enHits / scorable : 0;

  if (scorable < MIN_SCORABLE) {
    return {
      ok: markerHits >= MIN_MARKERS,
      ratio,
      enRatio,
      markerHits,
      scorableTokens: scorable,
      exemptTokens: exempt,
      reason:
        markerHits >= MIN_MARKERS
          ? undefined
          : `za mało tokenów PL po wykluczeniu nazw własnych (${markerHits} markerów)`
    };
  }

  if (enRatio > MAX_EN_RATIO) {
    return {
      ok: false,
      ratio,
      enRatio,
      markerHits,
      scorableTokens: scorable,
      exemptTokens: exempt,
      reason: `za dużo angielskiego (${(enRatio * 100).toFixed(1)}% EN stopwords)`
    };
  }

  if (markerHits < MIN_MARKERS) {
    return {
      ok: false,
      ratio,
      enRatio,
      markerHits,
      scorableTokens: scorable,
      exemptTokens: exempt,
      reason: `za mało polskich markerów (${markerHits} < ${MIN_MARKERS})`
    };
  }

  const ok = ratio >= MIN_RATIO;
  return {
    ok,
    ratio,
    enRatio,
    markerHits,
    scorableTokens: scorable,
    exemptTokens: exempt,
    reason: ok
      ? undefined
      : `niski marker ratio (${(ratio * 100).toFixed(1)}% < ${(MIN_RATIO * 100).toFixed(0)}%)`
  };
}
