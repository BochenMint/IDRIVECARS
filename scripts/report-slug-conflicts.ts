/**
 * Raport różnic dla 21 konfliktów slugów importu aG vs istniejące MDX.
 * Dry-run merge metadanych: npx tsx scripts/report-slug-conflicts.ts
 * Zapis: content/import/autogaleria/slug-conflict-report.json
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const REPORT_IN = path.join(ROOT, "content", "import", "autogaleria", "cms-integration-report.json");
const JSON_DIR = path.join(ROOT, "content", "import", "autogaleria", "articles", "json");
const OUT = path.join(ROOT, "content", "import", "autogaleria", "slug-conflict-report.json");

type ConflictItem = {
  slug: string;
  title: string;
  target: string;
};

type DiffReport = {
  slug: string;
  importTitle: string;
  existingTitle: string;
  existingPath: string;
  importPath: string;
  bodyLengthExisting: number;
  bodyLengthImport: number;
  publishedAtExisting?: string;
  publishedAtImport?: string;
  hasGalleryExisting: boolean;
  hasGalleryImport: boolean;
  recommendation: "keep-existing" | "merge-metadata-only" | "manual-review";
  mergeActions: string[];
};

import {
  assessFidelity,
  computeSubstringSimilarity,
  computeLeadSimilarity
} from "./lib/autogaleria-import/source-fidelity";

async function main(): Promise<void> {
  const integration = JSON.parse(await fs.readFile(REPORT_IN, "utf8")) as {
    conflicts: ConflictItem[];
  };

  const reports: DiffReport[] = [];

  for (const conflict of integration.conflicts) {
    const existingPath = path.join(ROOT, conflict.target);
    const importPath = path.join(JSON_DIR, `${conflict.slug}.json`);

    if (!existsSync(existingPath) || !existsSync(importPath)) {
      reports.push({
        slug: conflict.slug,
        importTitle: conflict.title,
        existingTitle: "?",
        existingPath: conflict.target,
        importPath: path.relative(ROOT, importPath),
        bodyLengthExisting: 0,
        bodyLengthImport: 0,
        hasGalleryExisting: false,
        hasGalleryImport: false,
        recommendation: "manual-review",
        mergeActions: ["Brak pliku do porównania"]
      });
      continue;
    }

    const existingRaw = await fs.readFile(existingPath, "utf8");
    const existing = matter(existingRaw);
    const imported = JSON.parse(await fs.readFile(importPath, "utf8")) as {
      title: string;
      lead?: string;
      excerpt?: string;
      bodyMarkdown?: string;
      headings?: Array<{ text: string }>;
      publishedAt?: string;
      provenance?: Record<string, unknown>;
      images?: { gallery?: string[] };
    };

    const simTitle = computeSubstringSimilarity(String(existing.data.title ?? ""), imported.title);
    const simBody = computeSubstringSimilarity(existing.content ?? "", imported.bodyMarkdown ?? "");
    const simLead = computeLeadSimilarity(
      String(existing.data.lead ?? ""),
      imported.lead ?? imported.excerpt ?? ""
    );
    const bodyLenExisting = existing.content?.trim().length ?? 0;
    const bodyLenImport = imported.bodyMarkdown?.trim().length ?? 0;
    const lengthRatio = bodyLenImport > 0 ? bodyLenExisting / bodyLenImport : 1;

    const mergeActions: string[] = [];
    let recommendation: DiffReport["recommendation"] = "manual-review";

    const fidelity = assessFidelity(
      conflict.slug,
      existingPath,
      existing.content ?? "",
      String(existing.data.lead ?? ""),
      imported,
      path.relative(ROOT, importPath)
    );

    if (fidelity.lowFidelity) {
      recommendation = "manual-review";
      mergeActions.push("NISKA WIERNOŚĆ ŹRÓDŁA — uruchom: npm run audit:source-fidelity -- --slug " + conflict.slug + " --fix");
      mergeActions.push("NIE merge-metadata-only — body wymaga replacement z importu JSON");
    } else if (simTitle >= 0.85 && simBody >= 0.5) {
      recommendation = "merge-metadata-only";
      mergeActions.push("Dodać originalUrl/sourceUrl/import z JSON do istniejącego frontmatter");
      mergeActions.push("Body zgodne ze źródłem — zachować istniejący tekst");
      if (!existing.data.originalUrl) mergeActions.push("Uzupełnić originalUrl z importu");
    } else if (bodyLenExisting > bodyLenImport * 1.2 && simBody >= 0.4) {
      recommendation = "keep-existing";
      mergeActions.push("Istniejący artykuł dłuższy i podobny — zachować treść, ewentualnie tylko provenance");
    } else {
      mergeActions.push("Różne tytuły/treść — diff ręczny lub audit:source-fidelity --fix");
    }

    reports.push({
      slug: conflict.slug,
      importTitle: imported.title,
      existingTitle: String(existing.data.title ?? ""),
      existingPath: conflict.target,
      importPath: path.relative(ROOT, importPath),
      bodyLengthExisting: existing.content?.trim().length ?? 0,
      bodyLengthImport: imported.bodyMarkdown?.trim().length ?? 0,
      publishedAtExisting: existing.data.publishedAt as string | undefined,
      publishedAtImport: imported.publishedAt,
      hasGalleryExisting: Boolean(existing.data.galleryDir || existing.data.heroImage),
      hasGalleryImport: Boolean((imported.images?.gallery?.length ?? 0) > 0),
      recommendation,
      mergeActions
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    total: reports.length,
    mergeMetadataOnly: reports.filter((r) => r.recommendation === "merge-metadata-only").length,
    keepExisting: reports.filter((r) => r.recommendation === "keep-existing").length,
    manualReview: reports.filter((r) => r.recommendation === "manual-review").length
  };

  await fs.writeFile(OUT, JSON.stringify({ summary, conflicts: reports }, null, 2), "utf8");

  console.log("Slug conflict report");
  console.log(JSON.stringify(summary, null, 2));
  console.log(path.relative(ROOT, OUT));
  for (const r of reports) {
    console.log(
      `  ${r.slug}: ${r.recommendation} (sim titles, len ${r.bodyLengthExisting}/${r.bodyLengthImport})`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
