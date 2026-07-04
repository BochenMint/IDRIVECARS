import type { FewShotQuery, MarcinStyleProfile } from "./types";
import { formatFewShotBlock, selectFewShotExamples } from "./retrieval";
import { readCorpusJsonl } from "./corpus-builder";
import { CORPUS_JSONL, PROFILE_JSON } from "./paths";
import { profileToMarkdown } from "./analyzer";

/** Skrócona instrukcja stylu Marcina do promptu lokalnego modelu. */
export function buildMarcinStyleInstructions(profile: MarcinStyleProfile): string {
  return [
    `Pisz w stylu ${profile.author} (idrivecars.pl / autoGALERIA).`,
    profile.plagiarismPolicy,
    "",
    "Ton:",
    ...profile.voice.tone.map((t) => `- ${t}`),
    "",
    `Rytm: ${profile.voice.rhythm}`,
    `Krytyka: ${profile.voice.criticism}`,
    "",
    "Zasady newsa:",
    ...profile.newsRules.map((r) => `- ${r}`),
    "",
    "Unikaj:",
    ...profile.antiPatterns.map((a) => `- ${a}`)
  ].join("\n");
}

export async function loadStyleProfile(): Promise<MarcinStyleProfile | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(PROFILE_JSON, "utf8")) as MarcinStyleProfile;
  } catch {
    return null;
  }
}

export async function buildStylePromptSection(query?: FewShotQuery): Promise<string> {
  const profile = await loadStyleProfile();
  if (!profile) {
    return "Styl: polski motoryzacyjny, konkretny, bez PR — profil stylu niezbudowany (uruchom npm run style:build).";
  }

  const parts = [buildMarcinStyleInstructions(profile)];

  if (query) {
    try {
      const corpus = await readCorpusJsonl(CORPUS_JSONL);
      const examples = selectFewShotExamples(corpus, {
        ...query,
        preferKind: query.preferKind ?? ["news", "felieton"]
      });
      const fewShot = formatFewShotBlock(examples);
      if (fewShot) parts.push(fewShot);
    } catch {
      // korpus opcjonalny w runtime
    }
  }

  return parts.join("\n\n");
}

export { profileToMarkdown };
