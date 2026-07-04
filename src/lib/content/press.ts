import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadAllNewsSources } from "@/lib/news/catalog";
import type { NewsSourceConfig } from "@/lib/news/types";

const LEGACY_PRESS_PATH = path.join(process.cwd(), "content", "press-sources.json");
const PRESS_CREDENTIALS_PATH = path.join(process.cwd(), "content", "press-credentials.json");

export type PressSource = {
  id: string;
  name: string;
  pressUrl: string;
  loginRequired: boolean;
  region: string;
  sourceType?: NewsSourceConfig["sourceType"];
};

export type PressCredentials = Record<string, { login: string; password: string }>;

function toPressSource(s: NewsSourceConfig): PressSource {
  return {
    id: s.id,
    name: s.name,
    pressUrl: s.pressUrl ?? s.fetchUrl,
    loginRequired: s.loginRequired,
    region: s.region,
    sourceType: s.sourceType
  };
}

export async function getPressSources(): Promise<PressSource[]> {
  const catalog = await loadAllNewsSources();
  if (catalog.length) {
    return catalog
      .filter((s) => s.loginRequired || s.sourceType !== "rss")
      .map(toPressSource);
  }

  if (!existsSync(LEGACY_PRESS_PATH)) return [];
  try {
    const raw = await fs.readFile(LEGACY_PRESS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Odczyt credentiali tylko po stronie serwera. Plik w .gitignore. */
export async function getPressCredentials(): Promise<PressCredentials> {
  if (!existsSync(PRESS_CREDENTIALS_PATH)) return {};
  try {
    const raw = await fs.readFile(PRESS_CREDENTIALS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function savePressCredentials(data: PressCredentials): Promise<void> {
  await fs.mkdir(path.dirname(PRESS_CREDENTIALS_PATH), { recursive: true });
  await fs.writeFile(PRESS_CREDENTIALS_PATH, JSON.stringify(data, null, 2), "utf8");
}
