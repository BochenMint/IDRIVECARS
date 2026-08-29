/**
 * Ustawia draft na importowanych artykułach bez mediów (bez niszczenia treści).
 * npx tsx scripts/draft-imports-without-media.ts
 * Dry-run: --dry-run
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const DIRS = ["testy", "blog", "felieton", "news"] as const;
const REPORT = path.join(ROOT, "content", "import", "autogaleria", "media-draft-report.json");

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const drafted: Array<{ slug: string; file: string; reason: string }> = [];

  for (const dir of DIRS) {
    const full = path.join(ROOT, "content", dir);
    if (!existsSync(full)) continue;

    for (const file of (await fs.readdir(full)).filter((f) => f.endsWith(".mdx"))) {
      const filePath = path.join(full, file);
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = matter(raw);
      const data = parsed.data as Record<string, unknown>;

      const isImport =
        data.import &&
        typeof data.import === "object" &&
        (data.import as { source?: string }).source === "autogaleria";
      if (!isImport) continue;
      if (data.status !== "published") continue;

      const category = String(data.category ?? dir);
      const textOnlyOk = category === "felieton";
      const hasMedia =
        (typeof data.galleryDir === "string" && data.galleryDir.trim()) ||
        (typeof data.heroImage === "string" && data.heroImage.trim());

      if (hasMedia || textOnlyOk) continue;

      const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
      drafted.push({
        slug: file.replace(/\.mdx$/, ""),
        file: rel,
        reason: "import autogaleria bez galleryDir/heroImage"
      });

      if (!dryRun) {
        data.status = "draft";
        await fs.writeFile(filePath, matter.stringify(parsed.content, data), "utf8");
      }
    }
  }

  await fs.writeFile(
    REPORT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun,
        count: drafted.length,
        note: "Felietony świadomie pominięte (tekst-only OK). Blog/testy/news bez galleryDir → draft.",
        drafted
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`${dryRun ? "[dry-run] " : ""}Draft: ${drafted.length} artykułów`);
  for (const d of drafted) console.log(`  ${d.file}`);
  console.log(path.relative(ROOT, REPORT));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
