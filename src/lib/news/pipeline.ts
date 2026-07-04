import fs from "node:fs/promises";
import path from "node:path";
import type {
  FetchedNewsItem,
  NewsImageAsset,
  NewsLicenseInfo,
  NewsSourceConfig,
  RawNewsRecord
} from "./types";
import { hashContent, makeRecordId } from "./hash";
import {
  ensureNewsDirs,
  isDuplicate,
  loadNewsIndex,
  loadRawRecord,
  saveNewsIndex,
  saveRawRecord,
  upsertIndexEntry,
  NEWS_IMAGES_DIR
} from "./store";

export type IngestResult = {
  saved: RawNewsRecord[];
  skipped: number;
  errors: string[];
};

function defaultLicense(source: NewsSourceConfig, item: FetchedNewsItem): NewsLicenseInfo {
  return {
    sourceName: source.name,
    sourceUrl: item.sourceUrl,
    usageNotes:
      source.licenseNotes ??
      "Materiał prasowy producenta — sprawdź warunki użytku w press roomie przed publikacją zdjęć.",
    requiresAttribution: true,
    commercialUseAllowed: false
  };
}

async function downloadImage(url: string, recordId: string, index: number): Promise<NewsImageAsset> {
  const asset: NewsImageAsset = { url };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "IDRIVECARS-NewsBot/1.0 (+https://idrivecars.pl)" },
      signal: AbortSignal.timeout(20_000)
    });
    if (!res.ok) return asset;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const fileName = `${recordId}-${index}.${ext}`;
    const localPath = path.join("images", fileName);
    const full = path.join(NEWS_IMAGES_DIR, fileName);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 8_000_000) return asset;
    await fs.writeFile(full, buf);
    asset.localPath = localPath;
  } catch {
    // brak obrazu nie blokuje ingestu
  }
  return asset;
}

export async function ingestFetchedItems(
  source: NewsSourceConfig,
  items: FetchedNewsItem[],
  options?: { downloadImages?: boolean }
): Promise<IngestResult> {
  await ensureNewsDirs();
  const index = await loadNewsIndex();
  const saved: RawNewsRecord[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const item of items) {
    if (!item.title || !item.sourceUrl) continue;

    const contentHash = hashContent({
      sourceUrl: item.sourceUrl,
      title: item.title,
      publishedAt: item.publishedAt
    });

    if (isDuplicate(index, contentHash)) {
      skipped++;
      continue;
    }

    const id = makeRecordId(contentHash, source.id);
    const storagePath = path.join("raw", `${id}.json`);
    const now = new Date().toISOString();

    let images = item.images ?? [];
    if (options?.downloadImages && images.length) {
      const downloaded: NewsImageAsset[] = [];
      for (let i = 0; i < Math.min(images.length, 3); i++) {
        downloaded.push(await downloadImage(images[i].url, id, i));
      }
      images = downloaded;
    }

    const record: RawNewsRecord = {
      id,
      contentHash,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.sourceType,
      sourceUrl: item.sourceUrl,
      title: item.title,
      lead: item.lead,
      bodyText: item.bodyText,
      bodyHtml: item.bodyHtml,
      publishedAt: item.publishedAt,
      fetchedAt: now,
      status: "raw",
      images,
      license: defaultLicense(source, item),
      manufacturerId: source.sourceType !== "rss" ? source.id : undefined,
      storagePath
    };

    try {
      await saveRawRecord(record);
      upsertIndexEntry(index, record);
      saved.push(record);
    } catch (e) {
      errors.push(`${item.title}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (saved.length) await saveNewsIndex(index);
  return { saved, skipped, errors };
}

export async function updateRecordStatus(
  recordId: string,
  status: RawNewsRecord["status"]
): Promise<RawNewsRecord | null> {
  const index = await loadNewsIndex();
  const entry = index.entries.find((e) => e.id === recordId);
  if (!entry) return null;
  const record = await loadRawRecord(entry.storagePath);
  if (!record) return null;
  record.status = status;
  await saveRawRecord(record);
  upsertIndexEntry(index, record);
  await saveNewsIndex(index);
  return record;
}

export async function markNeedsAiDraft(recordIds?: string[]): Promise<number> {
  const index = await loadNewsIndex();
  let count = 0;
  for (const entry of index.entries) {
    if (entry.status !== "raw") continue;
    if (recordIds && !recordIds.includes(entry.id)) continue;
    const record = await loadRawRecord(entry.storagePath);
    if (!record) continue;
    record.status = "needs-ai-draft";
    await saveRawRecord(record);
    upsertIndexEntry(index, record);
    count++;
  }
  if (count) await saveNewsIndex(index);
  return count;
}
