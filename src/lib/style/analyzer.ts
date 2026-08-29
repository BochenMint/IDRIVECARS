import type { MarcinStyleProfile, StyleArticleKind, StyleCorpusEntry } from "./types";
import { buildShingles, normalizeText, splitSentences, wordCount } from "./text-utils";

const FIRST_PERSON = /\b(ja|mnie|moj|moja|moje|moglbym|mam|jestem|widzialem|czulem|uwierzcie|osobiście)\b/i;
const READER = /\b(wy|was|wam|wasz|czytelnik|zapraszam)\b/i;

function ratio(texts: string[], re: RegExp): number {
  let hits = 0;
  let total = 0;
  for (const t of texts) {
  const sents = splitSentences(t);
    for (const s of sents) {
      total++;
      if (re.test(s)) hits++;
    }
  }
  return total ? hits / total : 0;
}

function topHeadings(entries: StyleCorpusEntry[], kind: StyleArticleKind, limit = 12): string[] {
  const freq = new Map<string, number>();
  for (const e of entries) {
    if (e.kind !== kind) continue;
    for (const h of e.headings) {
      const key = h.trim();
      if (key.length < 4 || key.length > 60) continue;
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([h]) => h);
}

function pickLeadExamples(entries: StyleCorpusEntry[]): MarcinStyleProfile["leads"]["examples"] {
  const byKind: Partial<Record<StyleArticleKind, StyleCorpusEntry>> = {};
  for (const e of entries) {
    if (!e.lead || e.lead.length < 40) continue;
    if (!byKind[e.kind]) byKind[e.kind] = e;
  }
  return Object.values(byKind).map((e) => ({
    title: e!.title,
    lead: e!.lead.slice(0, 280),
    kind: e!.kind
  }));
}

function collectMetaphorSamples(entries: StyleCorpusEntry[]): string[] {
  const patterns = [
    /jak po szynach/i,
    /krzyczy/i,
    /mknąć/i,
    /wał korbowy/i,
    /żabiej perspektyw/i,
    /czarna magia/i,
    /wciska nas w fotel/i,
    /tył lubi uciec/i
  ];
  const found: string[] = [];
  for (const e of entries) {
    for (const s of splitSentences(e.bodyPlain)) {
      if (patterns.some((p) => p.test(s)) && s.length < 200) {
        found.push(s.trim());
      }
      if (found.length >= 8) return found;
    }
  }
  return found;
}

export function analyzeCorpus(entries: StyleCorpusEntry[]): {
  profile: MarcinStyleProfile;
  shingles: string[];
} {
  const byKind = {} as Record<StyleArticleKind, number>;
  for (const k of ["test", "pierwsza-jazda", "felieton", "news", "blog", "galeria", "other"] as const) {
    byKind[k] = 0;
  }
  for (const e of entries) byKind[e.kind]++;

  const leads = entries.map((e) => e.lead).filter(Boolean);
  const bodies = entries.map((e) => e.bodyPlain);
  const testEntries = entries.filter((e) => e.kind === "test" || e.kind === "pierwsza-jazda");

  const allShingles = new Set<string>();
  for (const e of entries) {
    for (const sh of buildShingles(`${e.lead} ${e.bodyPlain}`)) {
      allShingles.add(sh);
    }
  }

  const profile: MarcinStyleProfile = {
    version: 1,
    author: "Marcin Bochenek",
    authorKey: "marcin-bochenek",
    generatedAt: new Date().toISOString(),
    corpusStats: {
      articleCount: entries.length,
      byKind,
      avgLeadWords: leads.length
        ? Math.round(leads.reduce((s, l) => s + wordCount(l), 0) / leads.length)
        : 0,
      avgBodyWords: entries.length
        ? Math.round(entries.reduce((s, e) => s + e.wordCount, 0) / entries.length)
        : 0,
      avgHeadingsPerTest: testEntries.length
        ? Math.round(
            testEntries.reduce((s, e) => s + e.headings.length, 0) / testEntries.length
          )
        : 0,
      firstPersonRatio: Math.round(ratio(bodies, FIRST_PERSON) * 100) / 100,
      readerAddressRatio: Math.round(ratio(bodies, READER) * 100) / 100
    },
    voice: {
      tone: [
        "konkretny i reporterski, bez korpo-buzzwordów",
        "pasjonacki, ale nie nachalny — czytelnik-trusted advisor",
        "bezpośredni w ocenie, z szacunkiem dla czytelnika (forma „Wy/Wam”)",
        "lekkie poczucie humoru i autoironia, nigdy memiczny clickbait"
      ],
      rhythm:
        "krótkie i średnie akapity (2–5 zdań); zmienne tempo — spokojne opisy przeplatane dynamicznymi zdaniami przy emocjach i osiągach",
      perspective:
        "pierwsza osoba liczby pojedynczej (ja) w testach i felietonach; liczba mnoga dla redakcji (my) przy okazji; bezpośrednie zwracanie się do czytelnika tam, gdzie naturalne",
      humor:
        "subtelna autoironia („Przepraszam, jeśli zatrzymałem kogoś przed monitorem”), żywe metafory motoryzacyjne, czasem puenta kończąca akapit",
      criticism:
        "krytyka oparta na obserwacji z jazdy/projektowania, nie na plotce; wady nazwane wprost, bez owijania w bawełnę; plusy konkretne (liczby, detale), nie ogólniki typu „świetny design”",
      metaphors: collectMetaphorSamples(entries)
    },
    leads: {
      patterns: [
        "pytanie retoryczne lub teza odnosząca się do czytelnika-pasjonata",
        "kontrast oczekiwań vs rzeczywistość („postawiłem poprzeczkę wysoko…”)",
        "krótkie zestawienie faktów w newsach (kto, co, gdzie, konsekwencja)",
        "zapowiedź emocji lub kontekstu bez clickbaitu"
      ],
      examples: pickLeadExamples(entries),
      rules: [
        "1–3 zdania, max ~45 słów dla newsa, do ~60 dla testu",
        "lead musi działać samodzielnie — bez „W tym artykule…”",
        "w newsie: konkret (marka, model, data, miejsce) w pierwszym zdaniu",
        "zakaz kopiowania leadów z korpusu — tylko naśladowanie rytmu"
      ]
    },
    headings: {
      testPatterns: [
        "krótkie, często dwuwyrazowe lub metaforyczne (np. „Emocje”, „Jest szybko”)",
        "pytania lub prowokacje („Co za dużo… to za mało?”)",
        "sekcje tematyczne: wygląd → wnętrze → jazda → cena/podsumowanie"
      ],
      examples: topHeadings(entries, "test", 10).concat(topHeadings(entries, "pierwsza-jazda", 6)),
      rules: [
        "śródtytuły jako ## lub **pogrubienie** — krótkie, nie całe zdania",
        "unikaj generycznych „Wnętrze” — lepiej „Nie tylko dla kierowcy”",
        "w newsach nagłówki opcjonalne; jeśli są — informacyjne, nie marketingowe"
      ]
    },
    structures: {
      test: [
        "lead z kontekstem i oczekiwaniami",
        "wstęp narracyjny (często z humorem)",
        "sekcje: design zewnętrzny → kabina/praktyczność → silnik/skrzynia → jazda → cena",
        "Zalety / Wady (lista +/−) + Podsumowanie z werdyktem osobistym"
      ],
      pierwszaJazda: [
        "jak test, ale krócej; nacisk na pierwsze wrażenia, nie pełna analityka",
        "często porównanie do konkurenta w leadzie"
      ],
      felieton: [
        "osobista historia lub obserwacja",
        "rozwinięcie z anegdotą i kontekstem",
        "puenta lub zaproszenie do dalszej lektury/serii"
      ],
      news: [
        "lead: fakty + stawka",
        "2–4 akapity: kontekst, szczegóły, reakcja/redakcyjny komentarz",
        "źródło na końcu; bez PR-słownictwa"
      ]
    },
    newsRules: [
      "parafrazuj komunikat — nie kopiuj zdań z press release",
      "dodaj kontekst dla polskiego czytelnika (segment, konkurencja, historia marki)",
      "podaj źródło (nazwa + link) w treści lub stopce",
      "ton: informacja + lekka ocena redakcyjna, nie reklama producenta",
      "konkret: liczby, daty, nazwiska — unikaj „rewolucyjny” bez dowodu",
      "ZAKAZ kopiowania zdań i akapitów z korpusu Marcina 1:1 — ucz się stylu, nie treści"
    ],
    antiPatterns: [
      "„rewolucyjny”, „przełomowy”, „lider segmentu” bez kontekstu",
      "„z radością informujemy”, „innowacyjne rozwiązanie” — korpo-PR",
      "clickbait („Nie uwierzysz…”, „Szok!”)",
      "puste superlatywy bez liczb lub obserwacji",
      "kopiowanie >8 słów z artykułów Marcina lub źródła prasowego"
    ],
    plagiarismPolicy:
      "Model ma naśladować ton, rytm i strukturę Marcina Bochenka, ale NIGDY nie wklejać istniejących zdań ani akapitów. Każdy tekst musi być oryginalną parafrazą materiału źródłowego.",
    fingerprint: {
      shingleCount: allShingles.size
    }
  };

  return { profile, shingles: [...allShingles] };
}

export function profileToMarkdown(profile: MarcinStyleProfile): string {
  const lines: string[] = [
    `# Profil stylu: ${profile.author}`,
    "",
    `Wygenerowano: ${profile.generatedAt}`,
    `Korpus: ${profile.corpusStats.articleCount} artykułów`,
    "",
    "## Głos",
    "",
    ...profile.voice.tone.map((t) => `- ${t}`),
    "",
    `**Rytm:** ${profile.voice.rhythm}`,
    "",
    `**Perspektywa:** ${profile.voice.perspective}`,
    "",
    `**Humor:** ${profile.voice.humor}`,
    "",
    `**Krytyka:** ${profile.voice.criticism}`,
    "",
    "## Leady — wzorce",
    "",
    ...profile.leads.patterns.map((p) => `- ${p}`),
    "",
    "## Struktura newsa",
    "",
    ...profile.structures.news.map((s, i) => `${i + 1}. ${s}`),
    "",
    "## Zasady newsów",
    "",
    ...profile.newsRules.map((r) => `- ${r}`),
    "",
    "## Antywzorce (PR, plagiat)",
    "",
    ...profile.antiPatterns.map((a) => `- ${a}`),
    "",
    "## Polityka anty-plagiatowa",
    "",
    profile.plagiarismPolicy,
    "",
    "## Statystyki korpusu",
    "",
    `- Średnia długość leadu: ${profile.corpusStats.avgLeadWords} słów`,
    `- Średnia długość artykułu: ${profile.corpusStats.avgBodyWords} słów`,
    `- Udział 1. os.: ${Math.round(profile.corpusStats.firstPersonRatio * 100)}%`,
    `- Zwracanie się do czytelnika: ${Math.round(profile.corpusStats.readerAddressRatio * 100)}%`,
    ""
  ];
  return lines.join("\n");
}
