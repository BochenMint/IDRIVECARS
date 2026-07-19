import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const PRESS_SOURCES_PATH = path.join(process.cwd(), "content", "press-sources.json");
const PRESS_CREDENTIALS_PATH = path.join(process.cwd(), "content", "press-credentials.json");

export type PressSource = {
  id: string;
  name: string;
  pressUrl: string;
  loginRequired: boolean;
  region: string;
};

export type PressCredentials = Record<string, { login: string; password: string }>;

export async function getPressSources(): Promise<PressSource[]> {
  try {
    const raw = await fs.readFile(PRESS_SOURCES_PATH, "utf8");
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
