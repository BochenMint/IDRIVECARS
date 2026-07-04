import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { NewsIndex, NewsIndexEntry, RawNewsRecord } from "./types";

export const NEWS_DATA_DIR = path.join(process.cwd(), "data", "news");
export const NEWS_RAW_DIR = path.join(NEWS_DATA_DIR, "raw");
export const NEWS_IMAGES_DIR = path.join(NEWS_DATA_DIR, "images");
export const NEWS_AI_DIR = path.join(NEWS_DATA_DIR, "ai-jobs");
export const NEWS_INDEX_PATH = path.join(NEWS_DATA_DIR, "index.json");

const EMPTY_INDEX: NewsIndex = {
  version: 1,
  updatedAt: new Date().toISOString(),
  entries: [],
  hashIndex: {}
};

export async function ensureNewsDirs(): Promise<void> {
  await fs.mkdir(NEWS_RAW_DIR, { recursive: true });
  await fs.mkdir(NEWS_IMAGES_DIR, { recursive: true });
  await fs.mkdir(NEWS_AI_DIR, { recursive: true });
}

export async function loadNewsIndex(): Promise<NewsIndex> {
  if (!existsSync(NEWS_INDEX_PATH)) return { ...EMPTY_INDEX };
  try {
    const raw = await fs.readFile(NEWS_INDEX_PATH, "utf8");
    return JSON.parse(raw) as NewsIndex;
  } catch {
    return { ...EMPTY_INDEX };
  }
}

export async function saveNewsIndex(index: NewsIndex): Promise<void> {
  await ensureNewsDirs();
  index.updatedAt = new Date().toISOString();
  await fs.writeFile(NEWS_INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

export async function loadRawRecord(storagePath: string): Promise<RawNewsRecord | null> {
  const full = path.join(NEWS_DATA_DIR, storagePath);
  if (!existsSync(full)) return null;
  try {
    return JSON.parse(await fs.readFile(full, "utf8")) as RawNewsRecord;
  } catch {
    return null;
  }
}

export async function saveRawRecord(record: RawNewsRecord): Promise<void> {
  await ensureNewsDirs();
  const full = path.join(NEWS_DATA_DIR, record.storagePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(record, null, 2), "utf8");
}

export function upsertIndexEntry(index: NewsIndex, record: RawNewsRecord): NewsIndex {
  const entry: NewsIndexEntry = {
    id: record.id,
    contentHash: record.contentHash,
    sourceUrl: record.sourceUrl,
    title: record.title,
    status: record.status,
    fetchedAt: record.fetchedAt,
    publishedAt: record.publishedAt,
    storagePath: record.storagePath
  };
  const existingIdx = index.entries.findIndex((e) => e.id === record.id);
  if (existingIdx >= 0) index.entries[existingIdx] = entry;
  else index.entries.unshift(entry);
  index.hashIndex[record.contentHash] = record.id;
  return index;
}

export function isDuplicate(index: NewsIndex, contentHash: string): boolean {
  return Boolean(index.hashIndex[contentHash]);
}

export async function listRecordsByStatus(
  status: RawNewsRecord["status"]
): Promise<RawNewsRecord[]> {
  const index = await loadNewsIndex();
  const records: RawNewsRecord[] = [];
  for (const entry of index.entries) {
    if (entry.status !== status) continue;
    const rec = await loadRawRecord(entry.storagePath);
    if (rec) records.push(rec);
  }
  return records;
}
