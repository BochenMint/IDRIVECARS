import path from "node:path";

export const STYLE_DIR = path.join(process.cwd(), "content", "style");
export const STYLE_DATA_DIR = path.join(process.cwd(), "data", "style");

export const CORPUS_JSONL = path.join(STYLE_DATA_DIR, "marcin-bochenek-corpus.jsonl");
export const PROFILE_JSON = path.join(STYLE_DIR, "marcin-bochenek-style.json");
export const PROFILE_MD = path.join(STYLE_DIR, "marcin-bochenek-style.md");
export const SHINGLES_JSON = path.join(STYLE_DATA_DIR, "marcin-bochenek-shingles.json");

export const AG_IMPORT_JSON_DIR = path.join(
  process.cwd(),
  "content",
  "import",
  "autogaleria",
  "articles",
  "json"
);
