export type {
  FewShotExample,
  FewShotQuery,
  MarcinStyleProfile,
  StyleArticleKind,
  StyleCorpusEntry,
  StyleGuardrailInput,
  StyleGuardrailResult
} from "./types";

export {
  AG_IMPORT_JSON_DIR,
  CORPUS_JSONL,
  PROFILE_JSON,
  PROFILE_MD,
  SHINGLES_JSON,
  STYLE_DATA_DIR,
  STYLE_DIR
} from "./paths";

export {
  articleJsonToCorpusEntry,
  buildCorpusFromImport,
  loadImportArticles,
  mapCategoryToKind,
  readCorpusJsonl,
  writeCorpusJsonl
} from "./corpus-builder";

export { analyzeCorpus, profileToMarkdown } from "./analyzer";

export { formatFewShotBlock, selectFewShotExamples } from "./retrieval";

export { loadCorpusShingles, validateStyleGuardrails } from "./guardrails";
export type { GuardrailOptions } from "./guardrails";
export { checkPolishLanguage } from "./polish-language";
export type { PolishLanguageResult } from "./polish-language";

export { buildMarcinStyleInstructions, buildStylePromptSection, loadStyleProfile } from "./prompt";

export {
  buildShingles,
  extractBrandsFromText,
  normalizeText,
  stripMarkdown,
  tokenizeForMatch,
  wordCount
} from "./text-utils";
