/**
 * Merge metadanych z importu aG do istniejących MDX (konflikty slugów).
 * Domyślnie dry-run. Zapis tylko z --apply.
 *
 * npx tsx scripts/merge-slug-conflicts.ts
 * npx tsx scripts/merge-slug-conflicts.ts --apply
 * npx tsx scripts/merge-slug-conflicts.ts --slug bmw-435i-cabriolet --apply
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const CONFLICT_REPORT = path.join(ROOT, "content", "import", "autogaleria", "slug-conflict-report.json");
const JSON_DIR = path.join(ROOT, "content", "import", "autogaleria", "articles", "json");
const APPLY_REPORT = path.join(ROOT, "content", "import", "autogaleria", "slug-merge-apply-report.json");

const APPLY = process.argv.includes("--apply");
const slugFilter = new Set(
  process.argv.filter((a) => /^[a-z0-9][a-z0-9-]*$/i.test(a) && a.length > 3)
);

type Conflict = {
  slug: string;
  recommendation: string;
  existingPath: string;
  importTitle?: string;
  existingTitle?: string;
  hasGalleryExisting?: boolean;
  hasGalleryImport?: boolean;
  bodyLengthExisting?: number;
  bodyLengthImport?: number;
  publishedAtExisting?: string;
  publishedAtImport?: string;
  mergeActions?: string[];
};

type FieldDiff = {
  field: string;
  before: unknown;
  after: unknown;
};

type MergeOutcome = {
  slug: string;
  existingPath: string;
  action: "applied" | "skipped" | "manual-review" | "error";
  patches: Record<string, unknown>;
  fieldDiffs?: FieldDiff[];
  note?: string;
};

function buildFieldDiffs(
  existing: Record<string, unknown>,
  patches: Record<string, unknown>
): FieldDiff[] {
  return Object.entries(patches).map(([field, after]) => ({
    field,
    before: existing[field] ?? null,
    after
  }));
}

function manualReviewDetail(c: Conflict): {
  slug: string;
  reason: string;
  conflicts: string[];
  existingTitle: string;
  importTitle: string;
  bodyLengthDelta: number;
  galleryConflict: boolean;
} {
  const delta = (c.bodyLengthImport ?? 0) - (c.bodyLengthExisting ?? 0);
  const conflicts: string[] = [];
  if (c.existingTitle && c.importTitle && c.existingTitle !== c.importTitle) {
    conflicts.push(`Tytuł: "${c.existingTitle}" vs "${c.importTitle}"`);
  }
  if (Math.abs(delta) > 500) {
    conflicts.push(`Różna długość body: existing ${c.bodyLengthExisting} vs import ${c.bodyLengthImport} (Δ ${delta})`);
  }
  if (c.hasGalleryExisting && c.hasGalleryImport) {
    conflicts.push("Oba warianty mają galerie — ryzyko nadpisania mediów");
  } else if (!c.hasGalleryExisting && c.hasGalleryImport) {
    conflicts.push("Import ma galerię, existing nie — merge metadanych OK, body wymaga decyzji");
  }
  return {
    slug: c.slug,
    reason: "Różna treść/tytuł — diff ręczny przed merge body",
    conflicts,
    existingTitle: c.existingTitle ?? "",
    importTitle: c.importTitle ?? "",
    bodyLengthDelta: delta,
    galleryConflict: Boolean(c.hasGalleryExisting && c.hasGalleryImport)
  };
}

function buildPatches(
  existing: Record<string, unknown>,
  imported: { sourceUrl?: string; provenance?: { importedAt?: string }; urlKey?: string }
): Record<string, unknown> {
  const patches: Record<string, unknown> = {};
  if (!existing.originalUrl && imported.sourceUrl) patches.originalUrl = imported.sourceUrl;
  if (!existing.sourceUrl && imported.sourceUrl) patches.sourceUrl = imported.sourceUrl;
  if (!existing.import) {
    patches.import = {
      source: "autogaleria",
      sourceId: imported.urlKey ?? "",
      importedAt: imported.provenance?.importedAt ?? new Date().toISOString()
    };
  }
  return patches;
}

async function main(): Promise<void> {
  const { conflicts, summary } = JSON.parse(await fs.readFile(CONFLICT_REPORT, "utf8")) as {
    conflicts: Conflict[];
    summary?: Record<string, unknown>;
  };

  const outcomes: MergeOutcome[] = [];
  let applied = 0;

  console.log(`${APPLY ? "[APPLY] " : "[dry-run] "}Merge konfliktów slugów (merge-metadata-only)\n`);

  for (const c of conflicts) {
    if (slugFilter.size && !slugFilter.has(c.slug)) continue;

    if (c.recommendation === "manual-review") {
      const detail = manualReviewDetail(c);
      outcomes.push({
        slug: c.slug,
        existingPath: c.existingPath,
        action: "manual-review",
        patches: {},
        note: detail.reason,
        fieldDiffs: [
          { field: "title", before: c.existingTitle, after: c.importTitle },
          {
            field: "bodyLength",
            before: c.bodyLengthExisting,
            after: c.bodyLengthImport
          },
          {
            field: "hasGallery",
            before: c.hasGalleryExisting,
            after: c.hasGalleryImport
          }
        ]
      });
      console.log(`⚠ ${c.slug} → MANUAL REVIEW (${c.existingTitle})`);
      continue;
    }

    if (c.recommendation !== "merge-metadata-only") continue;

    const existingPath = path.join(ROOT, c.existingPath);
    const importPath = path.join(JSON_DIR, `${c.slug}.json`);
    if (!existsSync(existingPath) || !existsSync(importPath)) {
      outcomes.push({
        slug: c.slug,
        existingPath: c.existingPath,
        action: "error",
        patches: {},
        note: "Brak pliku existing lub JSON importu"
      });
      console.log(`! ${c.slug} → brak plików`);
      continue;
    }

    const parsed = matter(await fs.readFile(existingPath, "utf8"));
    const imported = JSON.parse(await fs.readFile(importPath, "utf8")) as {
      sourceUrl?: string;
      provenance?: { importedAt?: string };
      urlKey?: string;
    };
    const patches = buildPatches(parsed.data as Record<string, unknown>, imported);

    const fieldDiffs = buildFieldDiffs(parsed.data as Record<string, unknown>, patches);

    if (!Object.keys(patches).length) {
      outcomes.push({
        slug: c.slug,
        existingPath: c.existingPath,
        action: "skipped",
        patches: {},
        note: "Frontmatter już kompletny"
      });
      console.log(`· ${c.slug} → skip (już OK)`);
      continue;
    }

    console.log(`\n${c.slug} → ${c.existingPath}`);
    for (const [k, v] of Object.entries(patches)) {
      const display = typeof v === "object" ? JSON.stringify(v) : String(v);
      console.log(`  + ${k}: ${display}`);
    }
    console.log("  body: BEZ ZMIAN");

    if (APPLY) {
      Object.assign(parsed.data, patches);
      await fs.writeFile(existingPath, matter.stringify(parsed.content, parsed.data), "utf8");
      applied += 1;
    }

    outcomes.push({
      slug: c.slug,
      existingPath: c.existingPath,
      action: APPLY ? "applied" : "skipped",
      patches,
      fieldDiffs,
      note: APPLY ? "zapisano" : "dry-run — użyj --apply"
    });
  }

  const manual = outcomes.filter((o) => o.action === "manual-review");
  const ready = outcomes.filter((o) => o.patches && Object.keys(o.patches).length > 0 && o.action !== "manual-review");
  const readySlugs = ready.map((o) => o.slug);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? "apply" : "dry-run",
    summary: {
      totalConflicts: summary?.total ?? conflicts.length,
      mergeMetadataOnly: summary?.mergeMetadataOnly ?? 16,
      manualReview: summary?.manualReview ?? 5,
      processed: outcomes.length,
      applied: APPLY ? applied : 0,
      pendingApply: APPLY ? 0 : ready.length,
      skippedComplete: outcomes.filter((o) => o.note === "Frontmatter już kompletny").length
    },
    morningDecision: {
      safeToApplyNow: !APPLY && ready.length > 0,
      command: `npm run merge:slug-conflicts -- --apply`,
      commandPerSlug: readySlugs.map(
        (slug) => `npm run merge:slug-conflicts -- --apply ${slug}`
      ),
      readySlugs,
      manualReviewSlugs: manual.map((m) => m.slug),
      doNotAutoMerge: conflicts
        .filter((c) => c.recommendation === "manual-review")
        .map((c) => manualReviewDetail(c))
    },
    metadataOnlyReady: ready.map((o) => ({
      slug: o.slug,
      existingPath: o.existingPath,
      fieldDiffs: o.fieldDiffs ?? [],
      patches: o.patches
    })),
    outcomes
  };

  await fs.writeFile(APPLY_REPORT, JSON.stringify(report, null, 2), "utf8");

  console.log(`\n---`);
  console.log(`Gotowe: ${APPLY ? applied + " zapisanych" : ready.length + " do zastosowania (--apply)"}`);
  console.log(`Manual review: ${manual.length} slugów — NIE merge bez akceptacji`);
  console.log(path.relative(ROOT, APPLY_REPORT));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
