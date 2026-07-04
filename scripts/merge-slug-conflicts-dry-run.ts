/**
 * Dry-run: pokazuje jakie pola frontmatter zostałoby uzupełnione z importu aG
 * dla konfliktów slugów (bez zapisu).
 *
 * npx tsx scripts/merge-slug-conflicts-dry-run.ts
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const CONFLICT_REPORT = path.join(ROOT, "content", "import", "autogaleria", "slug-conflict-report.json");
const JSON_DIR = path.join(ROOT, "content", "import", "autogaleria", "articles", "json");

async function main(): Promise<void> {
  const { conflicts } = JSON.parse(await fs.readFile(CONFLICT_REPORT, "utf8")) as {
    conflicts: Array<{ slug: string; recommendation: string; existingPath: string }>;
  };

  for (const c of conflicts) {
    if (c.recommendation !== "merge-metadata-only") continue;
    const existingPath = path.join(ROOT, c.existingPath);
    const importPath = path.join(JSON_DIR, `${c.slug}.json`);
    if (!existsSync(existingPath) || !existsSync(importPath)) continue;

    const existing = matter(await fs.readFile(existingPath, "utf8"));
    const imported = JSON.parse(await fs.readFile(importPath, "utf8")) as {
      sourceUrl?: string;
      provenance?: { importedAt?: string };
      urlKey?: string;
    };

    const patches: Record<string, string> = {};
    if (!existing.data.originalUrl && imported.sourceUrl) patches.originalUrl = imported.sourceUrl;
    if (!existing.data.sourceUrl && imported.sourceUrl) patches.sourceUrl = imported.sourceUrl;
    if (!existing.data.import) {
      patches["import.source"] = "autogaleria";
      patches["import.sourceId"] = imported.urlKey ?? c.slug;
      patches["import.importedAt"] = imported.provenance?.importedAt ?? "(now)";
    }

    console.log(`\n${c.slug} → ${c.existingPath}`);
    if (!Object.keys(patches).length) {
      console.log("  (brak brakujących pól — skip)");
      continue;
    }
    for (const [k, v] of Object.entries(patches)) console.log(`  + ${k}: ${v}`);
    console.log("  body: BEZ ZMIAN");
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
