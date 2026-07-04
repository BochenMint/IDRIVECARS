#!/usr/bin/env npx tsx
/**
 * Sanity check profilu stylu Marcina Bochenka.
 * Uruchom: npm run style:check
 */

import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import {
  readCorpusJsonl,
  selectFewShotExamples,
  validateStyleGuardrails,
  loadCorpusShingles,
  checkPolishLanguage
} from "../../src/lib/style";
import { CORPUS_JSONL, PROFILE_JSON, PROFILE_MD, SHINGLES_JSON } from "../../src/lib/style/paths";
import type { MarcinStyleProfile } from "../../src/lib/style/types";
import { validateAiFactCheck } from "../../src/lib/news/fact-check";

let failures = 0;

function fail(msg: string) {
  console.error("FAIL:", msg);
  failures++;
}

function ok(msg: string) {
  console.log("OK:", msg);
}

async function main() {
  for (const f of [CORPUS_JSONL, PROFILE_JSON, PROFILE_MD, SHINGLES_JSON]) {
    if (!existsSync(f)) fail(`Brak pliku: ${f}`);
    else ok(`Plik istnieje: ${f}`);
  }

  if (failures) {
    console.error("\nUruchom najpierw: npm run style:build");
    process.exitCode = 1;
    return;
  }

  const corpus = await readCorpusJsonl(CORPUS_JSONL);
  if (corpus.length < 50) fail(`Za mały korpus: ${corpus.length} (oczekiwano >= 50)`);
  else ok(`Korpus: ${corpus.length} artykułów`);

  const profile = JSON.parse(await fs.readFile(PROFILE_JSON, "utf8")) as MarcinStyleProfile;
  if (profile.authorKey !== "marcin-bochenek") fail("Niepoprawny authorKey");
  else ok("authorKey = marcin-bochenek");

  if (!profile.newsRules?.length) fail("Brak newsRules w profilu");
  else ok(`${profile.newsRules.length} zasad newsów`);

  if (!profile.plagiarismPolicy?.includes("NIGDY")) fail("Brak polityki anty-plagiatowej");
  else ok("Polityka anty-plagiatowa obecna");

  const shingles = await loadCorpusShingles(SHINGLES_JSON);
  if (shingles.size < 1000) fail(`Za mało shingles: ${shingles.size}`);
  else ok(`Shingles: ${shingles.size}`);

  const examples = selectFewShotExamples(corpus, {
    title: "BMW prezentuje nowy model elektryczny",
    brand: "bmw",
    tags: ["bmw", "elektryczny"],
    preferKind: ["news", "felieton"]
  }, 3);
  if (examples.length < 1) fail("Few-shot nie zwrócił przykładów");
  else ok(`Few-shot BMW: ${examples.map((e) => e.slug).join(", ")}`);

  const sampleGuard = validateStyleGuardrails(
    {
      title: "Mercedes zapowiada nową generację klasy E",
      lead:
        "Stuttgart potwierdził premierę nowej klasy E na wrzesień — hybryda plug-in ma przejechać ponad 100 km na prądzie, według producenta.",
      bodyMarkdown:
        "Mercedes-Benz pokazał teasery nadwozia. W segmencie premium konkurencja ze strony BMW i Audi jest duża, ale Stuttgart stawia na aerodynamikę i nowy kokpit z ekranem panoramicznym.\n\nŹródło: komunikat Mercedes-Benz.",
      sourceUrl: "https://media.mercedes-benz.com/example",
      sourceName: "Mercedes-Benz"
    },
    { corpusShingles: shingles }
  );
  if (!sampleGuard.ok) fail(`Guardrail sample fail: ${sampleGuard.checks.filter((c) => !c.ok).map((c) => c.id).join(", ")}`);
  else ok(`Guardrail sample OK (score ${sampleGuard.score})`);

  const plagiarized = validateStyleGuardrails(
    {
      title: "Test",
      lead: corpus[0].lead,
      bodyMarkdown: corpus[0].bodyPlain.slice(0, 800),
      sourceUrl: "https://example.com"
    },
    { corpusShingles: shingles, plagiarismThreshold: 0.05 }
  );
  if (plagiarized.ok) fail("Guardrail nie wykrył oczywistego plagiatu z korpusu");
  else ok("Guardrail wykrywa kopię z korpusu");

  const bielikSample = `Joby Aviation i Toyota uruchamiają sojusz produkcyjny dla mobilności powietrznej.
30 czerwca 2026 — Joby Aviation (NYSE: JOBY) oraz Toyota Motor Corporation ogłosiły uruchomienie wspólnego przedsięwzięcia mającego na celu masową produkcję elektrycznych samolotów pionowego startu i lądowania (eVTOL).
Sojusz ma przyspieszyć komercjalizację eVTOL-i. Toyota wnosi know-how z produkcji masowej, a Joby — technologię napędu elektrycznego i certyfikację FAA. Według komunikatu prasowego chodzi o demokratyzację podróży powietrznych.`;
  const bielikPl = checkPolishLanguage(bielikSample);
  if (!bielikPl.ok) fail(`Polish guardrail: bielik sample FAIL — ${bielikPl.reason}`);
  else ok(`Polish guardrail: bielik/EN proper nouns OK (ratio ${(bielikPl.ratio * 100).toFixed(1)}%)`);

  const englishGibberish = `The company announced today that the new electric vehicle will launch next year with advanced battery technology and strategic manufacturing alliance for global mobility excellence according to the press release.`;
  const enPl = checkPolishLanguage(englishGibberish);
  if (enPl.ok) fail("Polish guardrail: angielski bełkot przeszedł (powinien FAIL)");
  else ok(`Polish guardrail: angielski bełkot wykryty (${enPl.reason})`);

  const techPolish = `Nowy SUV z napędem AWD i silnikiem V8 spełnia normę WLTP. Producent potwierdził, że wersja EV oraz hybryda PHEV trafią do salonów jeszcze w tym roku, a model z ICE pozostanie w ofercie dla rynku USA.`;
  const techPl = checkPolishLanguage(techPolish);
  if (!techPl.ok) fail(`Polish guardrail: skróty techniczne FAIL — ${techPl.reason}`);
  else ok("Polish guardrail: skróty AWD/V8/WLTP/EV/ICE OK");

  const rawJoby = `Joby Aviation and Toyota (June 30, 2026) announced eVTOL alliance (NYSE: JOBY).`;
  const hallucinated = validateAiFactCheck({
    sourceText: rawJoby,
    publishedAt: "2026-06-30T11:58:45.000Z",
    output: {
      title: "Joby i Toyota",
      lead: "Sojusz eVTOL ogłoszony 30 czerwca 2026 roku przez Joby Aviation i Toyotę.",
      bodyMarkdown:
        "Rynek ma osiągnąć 1,5 bln USD do 2035, a loty komercyjne startują w 2030. FAA i NYSE potwierdzają skalę przedsięwzięcia."
    }
  });
  if (hallucinated.ok) fail("Fact-check: halucynacje liczb nie wykryte");
  else ok(`Fact-check: halucynacje wykryte (${hallucinated.issues.length} problemów)`);

  const faithful = validateAiFactCheck({
    sourceText: rawJoby,
    publishedAt: "2026-06-30T11:58:45.000Z",
    output: {
      title: "Joby i Toyota łączą siły w eVTOL",
      lead: "30 czerwca 2026 Joby Aviation i Toyota ogłosiły sojusz produkcyjny w segmencie eVTOL (NYSE: JOBY).",
      bodyMarkdown:
        "Połączenie technologii Joby z doświadczeniem Toyoty w produkcji masowej ma przyspieszyć mobilność powietrzną według komunikatu prasowego."
    }
  });
  if (!faithful.ok) fail(`Fact-check: poprawny parafraz FAIL — ${faithful.issues.map((i) => i.value).join(", ")}`);
  else ok("Fact-check: wierny parafraz OK");

  if (failures) {
    console.error(`\nStyle check: ${failures} błędów`);
    process.exitCode = 1;
  } else {
    console.log("\nStyle check: wszystko OK");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
