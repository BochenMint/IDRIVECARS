/**
 * Zastosowanie zatwierdzonych decyzji merge slugów (import body + frontmatter).
 * Nie używa merge:slug-conflicts --apply (tylko metadane).
 *
 * npx tsx scripts/apply-approved-slug-merges.ts
 * npx tsx scripts/apply-approved-slug-merges.ts --dry-run
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  composeMdxFromImport,
  type ImportedArticle,
  type Status
} from "./lib/autogaleria-import/mdx-from-import";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "content", "import", "autogaleria", "articles", "json");
const DRY_RUN = process.argv.includes("--dry-run");

/** Slug → akcja zatwierdzona przez redakcję */
const DECISIONS: Record<string, "import" | "existing" | "import-keep-title"> = {
  "bmw-435i": "import",
  "bmw-x6-m50d-fl": "existing",
  "lexus-nx-300h-f-sport": "existing",
  "mazda-mx-5-nd-do-korzeni": "import",
  "mercedes-gle-coupe-i-amg-gle-63-s-coupe-alternatywa": "import",
  "mercedes-maybach-s-600": "import",
  "nowa-skoda-superb-pierwszy-test-nowej-ery": "import",
  "nowy-fiat-500-nie-zepsuc-ikony": "import",
  "porsche-boxster-s": "existing",
  "rolls-royce-wraith": "existing",
  "volkswagen-passat-alltrack-all-inclusive": "import",
  "volkswagen-t6-500-shades-of-transporter": "import-keep-title"
};

const SEO_PRESERVE_KEYS = [
  "canonicalUrl",
  "headline",
  "updatedAt",
  "engine",
  "power",
  "torque",
  "gearbox",
  "drivetrain",
  "bodyType",
  "heroVideoUrl",
  "heroVideoPoster"
] as const;

const CONTENT_DIRS = ["testy", "blog", "felieton", "news"] as const;

async function findMdxPath(slug: string): Promise<string | null> {
  for (const dir of CONTENT_DIRS) {
    const mdx = path.join(ROOT, "content", dir, `${slug}.mdx`);
    if (existsSync(mdx)) return mdx;
    const md = path.join(ROOT, "content", dir, `${slug}.md`);
    if (existsSync(md)) return md;
  }
  return null;
}

function preserveLocalSeo(
  merged: Record<string, unknown>,
  existing: Record<string, unknown>
): void {
  for (const key of SEO_PRESERVE_KEYS) {
    if (merged[key] == null && existing[key] != null) {
      merged[key] = existing[key];
    }
  }
  if (existing.category && merged.category == null) {
    merged.category = existing.category;
  }
}

async function applyImport(
  slug: string,
  keepTitle: boolean
): Promise<{ ok: boolean; path?: string; note?: string }> {
  const mdxPath = await findMdxPath(slug);
  if (!mdxPath) return { ok: false, note: "Brak pliku MDX" };

  const jsonPath = path.join(JSON_DIR, `${slug}.json`);
  if (!existsSync(jsonPath)) return { ok: false, note: "Brak JSON importu" };

  const existingRaw = await fs.readFile(mdxPath, "utf8");
  const existing = matter(existingRaw);
  const existingData = existing.data as Record<string, unknown>;
  const preservedTitle = keepTitle ? String(existingData.title ?? "") : undefined;
  const preservedSeoTitle =
    keepTitle && existingData.seoTitle ? String(existingData.seoTitle) : undefined;

  const imported = JSON.parse(await fs.readFile(jsonPath, "utf8")) as ImportedArticle;
  const preserveStatus = (existingData.status as Status | undefined) ?? undefined;
  const preserveGallery =
    existingData.galleryDir || existingData.heroImage
      ? {
          galleryDir: existingData.galleryDir as string | undefined,
          heroImage: existingData.heroImage as string | undefined
        }
      : undefined;

  let next = await composeMdxFromImport(
    { ...imported, slug },
    { preserveGallery, preserveStatus }
  );

  const parsed = matter(next);
  const merged = parsed.data as Record<string, unknown>;
  preserveLocalSeo(merged, existingData);

  if (keepTitle && preservedTitle) {
    merged.title = preservedTitle;
    if (preservedSeoTitle) merged.seoTitle = preservedSeoTitle;
  }

  next = matter.stringify(parsed.content, merged);

  if (!DRY_RUN) {
    await fs.writeFile(mdxPath, next, "utf8");
  }

  return { ok: true, path: path.relative(ROOT, mdxPath).replace(/\\/g, "/") };
}

async function main(): Promise<void> {
  console.log(DRY_RUN ? "[dry-run] " : "[apply] ", "Zatwierdzone merge slugów\n");

  const applied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ slug: string; note: string }> = [];

  for (const [slug, action] of Object.entries(DECISIONS)) {
    if (action === "existing") {
      skipped.push(slug);
      console.log(`· ${slug} → existing (bez zmian)`);
      continue;
    }

    const keepTitle = action === "import-keep-title";
    const result = await applyImport(slug, keepTitle);
    if (result.ok) {
      applied.push(slug);
      const suffix = keepTitle ? " (import + tytuł existing)" : " (import)";
      console.log(`✓ ${slug} → ${result.path}${suffix}`);
    } else {
      errors.push({ slug, note: result.note ?? "błąd" });
      console.log(`! ${slug} → ${result.note}`);
    }
  }

  console.log(`\n---\nZastosowano: ${applied.length}, pominięto: ${skipped.length}, błędy: ${errors.length}`);
  if (DRY_RUN) console.log("Uruchom bez --dry-run aby zapisać pliki.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
