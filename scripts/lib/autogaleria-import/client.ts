import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { AgPostApi, DiscoveredUrl } from "./types";

const BASE = "https://autogaleria.pl";
const USER_AGENT = "IDRIVECARS-Import/1.0 (+https://idrivecars.pl; autogaleria archive import)";
const DELAY_MS = 700;
const MAX_RETRIES = 3;

const ES_SEARCH =
  `${BASE}/api/index/autogaleria/_search?type=post` +
  "&_source_includes=id,title,isHot,author,date,gallery,thumbnail,type,urlKey,categories";

export type ClientOptions = {
  cacheDir: string;
  delayMs?: number;
};

let lastRequestAt = 0;

async function throttle(ms: number): Promise<void> {
  const wait = Math.max(0, lastRequestAt + ms - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "User-Agent": USER_AGENT,
          ...(init?.headers ?? {})
        }
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, attempt * 1200));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, attempt * 900));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function cachePath(cacheDir: string, key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
  return path.join(cacheDir, `${safe}.json`);
}

export async function readCache<T>(cacheDir: string, key: string): Promise<T | null> {
  const p = cachePath(cacheDir, key);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await fs.readFile(p, "utf8")) as T;
  } catch {
    return null;
  }
}

export async function writeCache(cacheDir: string, key: string, data: unknown): Promise<void> {
  const p = cachePath(cacheDir, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
}

export type EsSearchPayload = {
  hits?: {
    total?: number | { value: number };
    hits?: Array<{
      _source: { urlKey: string; title?: string; date?: string };
    }>;
  };
};

export async function discoverAuthorPosts(
  authorKey: string,
  opts: ClientOptions
): Promise<{ urls: DiscoveredUrl[]; total: number }> {
  const pageSize = 16;
  const urls: DiscoveredUrl[] = [];
  let from = 0;
  let total = 0;

  while (true) {
    await throttle(opts.delayMs ?? DELAY_MS);
    const body = {
      query: {
        bool: {
          filter: [{ term: { type: "post" } }, { term: { "author.key": authorKey } }]
        }
      },
      size: pageSize,
      from,
      sort: [{ date: { order: "desc" } }]
    };

    const cacheKey = `es-author-${authorKey}-from-${from}`;
    let payload = await readCache<EsSearchPayload>(opts.cacheDir, cacheKey);

    if (!payload) {
      const res = await fetchWithRetry(ES_SEARCH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`ES search HTTP ${res.status}`);
      payload = await res.json();
      await writeCache(opts.cacheDir, cacheKey, payload);
    }

    const hits = payload.hits?.hits ?? [];
    const totalVal = payload.hits?.total;
    total = typeof totalVal === "number" ? totalVal : totalVal?.value ?? hits.length;

    for (const hit of hits) {
      const src = hit._source;
      urls.push({
        urlKey: src.urlKey,
        sourceUrl: `${BASE}/${src.urlKey}`,
        title: src.title,
        date: src.date,
        discoveredVia: "elasticsearch-author"
      });
    }

    from += hits.length;
    if (!hits.length || from >= total) break;
  }

  return { urls, total };
}

export async function fetchPostByUrlKey(
  urlKey: string,
  opts: ClientOptions
): Promise<AgPostApi> {
  const cacheKey = `post-${urlKey}`;
  const cached = await readCache<AgPostApi>(opts.cacheDir, cacheKey);
  if (cached?.id) return cached;

  await throttle(opts.delayMs ?? DELAY_MS);
  const res = await fetchWithRetry(`${BASE}/api/posts/${encodeURIComponent(urlKey)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${urlKey}`);
  const data = (await res.json()) as AgPostApi;
  await writeCache(opts.cacheDir, cacheKey, data);
  return data;
}

export async function downloadImage(
  url: string,
  destPath: string,
  opts: ClientOptions
): Promise<boolean> {
  if (existsSync(destPath)) return true;
  await throttle(opts.delayMs ?? DELAY_MS);
  try {
    const res = await fetchWithRetry(url);
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.writeFile(destPath, buf);
    return true;
  } catch {
    return false;
  }
}

export const PAGINATION_INFO = {
  mechanism:
    'Przycisk "Pokaż więcej" wywołuje Vuex author/list → POST Elasticsearch /api/index/autogaleria/_search?type=post z filtrem author.key, parametrami from (start) i size (domyślnie 16).',
  endpoint: ES_SEARCH,
  pageSize: 16
};
