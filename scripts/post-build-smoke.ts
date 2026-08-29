/**
 * Lekki smoke po `npm run build` — bez dev servera i bez deployu.
 * Sprawdza manifest buildu, kluczowe trasy SSG oraz artefakty SEO.
 *
 * Uruchom: npm run smoke:static
 * Wymaga wcześniejszego: npm run build
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");

type Check = { name: string; ok: boolean; detail: string };

const MUST_EXIST_ROUTES = [
  "/",
  "/testy",
  "/news",
  "/blog",
  "/felieton",
  "/sitemap.xml",
  "/feed.xml",
  "/robots.txt",
  "/testy/citroen-c3-16-vti-exclusive-2",
  "/testy/test-mercedes-amg-gt-s-testujemy-rywala-911",
  "/testy/bentley-continental-gt-v8-s-convertible"
];

/** Szkice CMS — generateStaticParams pomija status !== published. */
const CMS_DRAFT_ROUTES_ABSENT = [
  "/testy/bmw-328i-xdrive",
  "/blog/tapety-z-naszego-testu-bentley-continental-gt-v8-s-convertible"
];

/** News: generateStaticParams zwraca wszystkie slugi MDX (strona zwraca 404 gdy draft). */
const NEWS_DRAFT_ROUTES_KNOWN_PRERENDER = ["/news/mercedes-amg-gt-s-video"];

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function routeInPrerenderManifest(route: string, routes: Record<string, unknown>): boolean {
  const normalized = route === "/" ? "/" : route.replace(/\/$/, "");
  return Object.prototype.hasOwnProperty.call(routes, normalized);
}

function main(): void {
  const checks: Check[] = [];

  const buildIdPath = path.join(NEXT_DIR, "BUILD_ID");
  checks.push({
    name: "BUILD_ID",
    ok: fs.existsSync(buildIdPath),
    detail: fs.existsSync(buildIdPath)
      ? `build ${fs.readFileSync(buildIdPath, "utf8").trim()}`
      : "brak .next/BUILD_ID — uruchom npm run build"
  });

  const manifestPath = path.join(NEXT_DIR, "prerender-manifest.json");
  const prerender = readJson<{ routes?: Record<string, unknown> }>(manifestPath);
  const routes = prerender?.routes ?? {};

  for (const route of MUST_EXIST_ROUTES) {
    const ok = routeInPrerenderManifest(route, routes);
    checks.push({
      name: `route exists: ${route}`,
      ok,
      detail: ok ? "w prerender-manifest" : "brak w prerender-manifest.json"
    });
  }

  for (const route of CMS_DRAFT_ROUTES_ABSENT) {
    const absent = !routeInPrerenderManifest(route, routes);
    checks.push({
      name: `CMS draft absent: ${route}`,
      ok: absent,
      detail: absent ? "OK — szkic nie w SSG" : "UWAGA: szkic w manifeście SSG"
    });
  }

  for (const route of NEWS_DRAFT_ROUTES_KNOWN_PRERENDER) {
    const inManifest = routeInPrerenderManifest(route, routes);
    checks.push({
      name: `news draft prerender: ${route}`,
      ok: true,
      detail: inManifest
        ? "INFO: w manifeście (404 runtime) — rozważ filtrowanie generateStaticParams"
        : "brak w manifeście"
    });
  }

  const galleriesManifest = path.join(ROOT, "src", "data", "galleries-manifest.json");
  if (fs.existsSync(galleriesManifest)) {
    const gm = readJson<Record<string, unknown[]>>(galleriesManifest);
    const keys = gm ? Object.keys(gm).filter((k) => Array.isArray(gm[k])) : [];
    const images = keys.reduce((sum, k) => sum + (gm![k]?.length ?? 0), 0);
    checks.push({
      name: "galleries-manifest.json",
      ok: keys.length > 0,
      detail: `${keys.length} galerii, ${images} zdjęć`
    });
  } else {
    checks.push({
      name: "galleries-manifest.json",
      ok: false,
      detail: "brak pliku — uruchom npm run generate:galleries-manifest"
    });
  }

  const citroenRedirect = fs.readFileSync(path.join(ROOT, "next.config.mjs"), "utf8");
  checks.push({
    name: "redirect citroen-c3",
    ok: citroenRedirect.includes("citroen-c3-16-vti-exclusive-2"),
    detail: "next.config.mjs → canonical slug"
  });

  const failed = checks.filter((c) => !c.ok);
  console.log("=== post-build-smoke ===\n");
  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} OK`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
