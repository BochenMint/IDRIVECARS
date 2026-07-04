import type { NewsSourceConfig } from "./types";
import { filterSourcesForScan, loadNewsCatalog, passesKeywordFilters } from "./catalog";
import { fetchFromSource } from "./adapters";
import { ingestFetchedItems, markNeedsAiDraft } from "./pipeline";

export type ScanOptions = {
  sourceIds?: string[];
  downloadImages?: boolean;
  autoQueueAi?: boolean;
  dryRun?: boolean;
};

export type ScanReport = {
  startedAt: string;
  finishedAt: string;
  sourcesScanned: number;
  itemsSaved: number;
  itemsSkipped: number;
  aiQueued: number;
  errors: Array<{ sourceId: string; message: string }>;
  savedIds: string[];
};

export async function runNewsScan(options: ScanOptions = {}): Promise<ScanReport> {
  const startedAt = new Date().toISOString();
  let catalog = await loadNewsCatalog();
  catalog = filterSourcesForScan(catalog);
  if (options.sourceIds?.length) {
    catalog = catalog.filter((s) => options.sourceIds!.includes(s.id));
  }

  const errors: ScanReport["errors"] = [];
  let itemsSaved = 0;
  let itemsSkipped = 0;
  const savedIds: string[] = [];

  for (const source of catalog) {
    try {
      const fetched = await fetchFromSource(source);
      const filtered = fetched.filter((item) => passesKeywordFilters(item, source));
      if (options.dryRun) {
        console.log(`[dry-run] ${source.id}: ${filtered.length} pozycji`);
        continue;
      }
      const result = await ingestFetchedItems(source, filtered, {
        downloadImages: options.downloadImages ?? false
      });
      itemsSaved += result.saved.length;
      itemsSkipped += result.skipped;
      savedIds.push(...result.saved.map((r) => r.id));
      for (const err of result.errors) {
        errors.push({ sourceId: source.id, message: err });
      }
    } catch (e) {
      errors.push({
        sourceId: source.id,
        message: e instanceof Error ? e.message : String(e)
      });
    }
  }

  let aiQueued = 0;
  if (!options.dryRun && options.autoQueueAi !== false) {
    aiQueued = await markNeedsAiDraft(savedIds.length ? savedIds : undefined);
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    sourcesScanned: catalog.length,
    itemsSaved,
    itemsSkipped,
    aiQueued,
    errors,
    savedIds
  };
}

export async function scanSingleSource(source: NewsSourceConfig): Promise<ScanReport> {
  return runNewsScan({ sourceIds: [source.id] });
}
