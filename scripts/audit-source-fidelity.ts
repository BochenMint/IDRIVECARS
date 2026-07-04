/**
 * Audits CMS MDX against staged autoGALERIA import JSON.
 * Detects GPT rewrites / placeholder content and optionally repairs from source.
 *
 * npm run audit:source-fidelity
 * npm run audit:source-fidelity -- --fix
 * npm run audit:source-fidelity -- --slug bmw-x6-m50d-fl --fix
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { assessFidelity, shouldAutoFixFromImport, type FidelityReport, type ImportArticleLike } from "./lib/autogaleria-import/source-fidelity";
import {
  composeMdxFromImport,
  type ImportedArticle,
  type Status
} from "./lib/autogaleria-import/mdx-from-import";

const ROOT = process.cwd();
const JSON_DIR = path.join(ROOT, "content", "import", "autogaleria", "articles", "json");
const MARKDOWN_DIR = path.join(ROOT, "content", "import", "autogaleria", "articles", "markdown");
const REPORT_PATH = path.join(ROOT, "content", "import", "autogaleria", "source-fidelity-report.json");
const CONTENT_DIRS = ["testy", "blog", "felieton", "news"] as const;

const FIX = process.argv.includes("--fix");
const slugFilter = new Set(
  process.argv.filter((a, i, arr) => {
    const prev = arr[i - 1];
    return prev === "--slug" && /^[a-z0-9][a-z0-9-]*$/i.test(a);
  })
);

type AuditRow = FidelityReport & {
  mdxRelative: string;
  fixed?: boolean;
  skippedReason?: string;
};

function extractAgSlug(url: unknown): string | null {
  if (typeof url !== "string" || !url.includes("autogaleria")) return null;
  const cleaned = url.replace(/https?:\/\/(?:www\.)?autogaleria\.pl\/?/i, "").replace(/\/$/, "");
  const slug = cleaned.split("/").pop();
  return slug && slug.length > 2 ? slug : null;
}

function isAutogaleriaMdx(data: Record<string, unknown>): boolean {
  const imp = data.import as { source?: string } | undefined;
  if (imp?.source === "autogaleria") return true;
  const original = String(data.originalUrl ?? data.sourceUrl ?? "");
  if (original.includes("autogaleria.pl")) return true;
  return false;
}

async function loadImport(slug: string): Promise<{ article: ImportedArticle; path: string } | null> {
  const jsonPath = path.join(JSON_DIR, `${slug}.json`);
  if (existsSync(jsonPath)) {
    const article = JSON.parse(await fs.readFile(jsonPath, "utf8")) as ImportedArticle;
    return { article, path: jsonPath };
  }
  const mdPath = path.join(MARKDOWN_DIR, `${slug}.md`);
  if (existsSync(mdPath)) {
    const raw = await fs.readFile(mdPath, "utf8");
    const parsed = matter(raw);
    const article: ImportedArticle = {
      slug,
      urlKey: slug,
      sourceUrl: String(parsed.data.sourceUrl ?? `https://autogaleria.pl/${slug}`),
      title: String(parsed.data.title ?? slug),
      lead: String(parsed.data.lead ?? ""),
      publishedAt: String(parsed.data.publishedAt ?? "1970-01-01"),
      bodyMarkdown: parsed.content.trim(),
      tags: (parsed.data.tags as string[]) ?? [],
      author: { name: String(parsed.data.author ?? "Marcin Bochenek") }
    };
    return { article, path: mdPath };
  }
  return null;
}

async function collectMdxFiles(): Promise<Array<{ slug: string; filePath: string; dir: string }>> {
  const out: Array<{ slug: string; filePath: string; dir: string }> = [];
  for (const dir of CONTENT_DIRS) {
    const full = path.join(ROOT, "content", dir);
    if (!existsSync(full)) continue;
    for (const file of await fs.readdir(full)) {
      if (!file.endsWith(".mdx") && !file.endsWith(".md")) continue;
      const slug = file.replace(/\.mdx?$/, "");
      if (slugFilter.size && !slugFilter.has(slug)) continue;
      out.push({ slug, filePath: path.join(full, file), dir });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const files = await collectMdxFiles();
  const importSlugs = new Set(
    (await fs.readdir(JSON_DIR).catch(() => [] as string[])).map((f) => f.replace(/\.json$/, ""))
  );

  const rows: AuditRow[] = [];
  let fixed = 0;
  let lowCount = 0;

  for (const { slug, filePath, dir } of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    const data = parsed.data as Record<string, unknown>;

    const hasImport = importSlugs.has(slug);
    const fromAg = isAutogaleriaMdx(data) || hasImport;

    if (!fromAg && !slugFilter.has(slug)) continue;

    // Compare body only when import JSON matches this file's slug (not cross-linked originalUrl)
    const loaded = hasImport ? await loadImport(slug) : null;
    const importArticle: ImportArticleLike | null = loaded?.article ?? null;
    const importPath = loaded ? path.relative(ROOT, loaded.path).replace(/\\/g, "/") : null;

    const report = assessFidelity(
      slug,
      filePath,
      parsed.content,
      String(data.lead ?? ""),
      importArticle,
      importPath
    );

    const row: AuditRow = {
      ...report,
      mdxRelative: path.join("content", dir, path.basename(filePath)).replace(/\\/g, "/")
    };

    if (report.lowFidelity && loaded) {
      lowCount += 1;
      if (FIX && shouldAutoFixFromImport(report) && hasImport) {
        const preserveStatus = (data.status as Status | undefined) ?? undefined;
        const preserveGallery =
          data.galleryDir || data.heroImage
            ? {
                galleryDir: data.galleryDir as string | undefined,
                heroImage: data.heroImage as string | undefined
              }
            : undefined;

        const next = await composeMdxFromImport(
          { ...loaded.article, slug },
          {
            preserveGallery,
            preserveStatus
          }
        );
        await fs.writeFile(filePath, next, "utf8");
        row.fixed = true;
        fixed += 1;
      } else if (FIX && report.lowFidelity) {
        row.skippedReason = shouldAutoFixFromImport(report)
          ? undefined
          : "Istniejący tekst dłuższy/niezgodny ze stubem importu — wymaga ręcznej decyzji";
      }
    } else if (report.lowFidelity && !loaded) {
      row.skippedReason = "Brak pliku importu JSON/MD — wymaga ręcznej naprawy";
    }

    rows.push(row);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    mode: FIX ? "fix" : "audit",
    scanned: rows.length,
    lowFidelity: rows.filter((r) => r.lowFidelity).length,
    fixed,
    ok: rows.filter((r) => !r.lowFidelity && !r.issues.includes("missing-source-import")).length,
    warnings: rows.filter((r) => r.issues.length && !r.lowFidelity).length
  };

  await fs.writeFile(REPORT_PATH, JSON.stringify({ summary, articles: rows }, null, 2), "utf8");

  console.log("Source fidelity audit");
  console.log(JSON.stringify(summary, null, 2));
  console.log(path.relative(ROOT, REPORT_PATH));

  for (const r of rows.filter((x) => x.lowFidelity)) {
    console.log(
      `  ${r.fixed ? "FIXED" : "LOW"} ${r.slug}: ${r.reason} (${r.bodyLengthMdx} vs ${r.bodyLengthImport} chars)`
    );
  }

  if (summary.lowFidelity > fixed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
