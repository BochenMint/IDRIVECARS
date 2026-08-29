/**
 * Converts staged autoGALERIA imports into the CMS MDX format.
 *
 * Source: content/import/autogaleria/articles/json/*.json
 * Target: content/testy | content/blog | content/felieton | content/news
 *
 * Never overwrites existing articles. Conflicts → cms-integration-report.json.
 * For existing MDX with wrong body use: npm run audit:source-fidelity -- --fix
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  composeMdxFromImport,
  isGalleryOrShort,
  mapCategory,
  resolveMedia,
  type ImportedArticle,
  type Status
} from "./lib/autogaleria-import/mdx-from-import";

type CmsCategory = "test" | "pierwsza-jazda" | "blog" | "felieton" | "news";

type ReportItem = {
  slug: string;
  title: string;
  category: CmsCategory;
  status?: Status;
  target?: string;
  reason?: string;
};

type Report = {
  generatedAt: string;
  counts: {
    source: number;
    created: number;
    skipped: number;
    conflicts: number;
    draft: number;
    published: number;
    warnings: number;
  };
  created: ReportItem[];
  skipped: ReportItem[];
  conflicts: ReportItem[];
  warnings: Array<{ slug: string; message: string }>;
  categoryCounts: Record<CmsCategory, number>;
};

const ROOT = process.cwd();
const IMPORT_ROOT = path.join(ROOT, "content", "import", "autogaleria");
const SOURCE_DIR = path.join(IMPORT_ROOT, "articles", "json");
const REPORT_PATH = path.join(IMPORT_ROOT, "cms-integration-report.json");
const CONTENT_ROOT = path.join(ROOT, "content");

const CONTENT_DIRS: Record<CmsCategory, string> = {
  test: "testy",
  "pierwsza-jazda": "testy",
  blog: "blog",
  felieton: "felieton",
  news: "news"
};

function slugFile(slug: string, dir: string): string {
  return path.join(CONTENT_ROOT, dir, `${slug}.mdx`);
}

async function buildExistingSlugIndex(): Promise<Map<string, string>> {
  const index = new Map<string, string>();
  for (const dir of Object.values(CONTENT_DIRS)) {
    const full = path.join(CONTENT_ROOT, dir);
    if (!existsSync(full)) continue;
    const files = await fs.readdir(full);
    for (const file of files) {
      if (!file.endsWith(".md") && !file.endsWith(".mdx")) continue;
      index.set(file.replace(/\.mdx?$/, ""), dir);
    }
  }
  return index;
}

async function readImportedArticles(): Promise<ImportedArticle[]> {
  const files = (await fs.readdir(SOURCE_DIR)).filter((file) => file.endsWith(".json")).sort();
  const articles: ImportedArticle[] = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(SOURCE_DIR, file), "utf8");
    articles.push(JSON.parse(raw) as ImportedArticle);
  }
  return articles;
}

async function main(): Promise<void> {
  const articles = await readImportedArticles();
  const existing = await buildExistingSlugIndex();
  const report: Report = {
    generatedAt: new Date().toISOString(),
    counts: {
      source: articles.length,
      created: 0,
      skipped: 0,
      conflicts: 0,
      draft: 0,
      published: 0,
      warnings: 0
    },
    created: [],
    skipped: [],
    conflicts: [],
    warnings: [],
    categoryCounts: {
      test: 0,
      "pierwsza-jazda": 0,
      blog: 0,
      felieton: 0,
      news: 0
    }
  };

  for (const article of articles) {
    const category = mapCategory(article);
    const targetDir = CONTENT_DIRS[category];
    const target = slugFile(article.slug, targetDir);
    report.categoryCounts[category] += 1;

    const existingDir = existing.get(article.slug);
    if (existingDir) {
      const item = {
        slug: article.slug,
        title: article.title,
        category,
        target: path.join("content", existingDir, `${article.slug}.mdx`).replace(/\\/g, "/"),
        reason:
          "slug już istnieje; pominięto bez nadpisywania — uruchom audit:source-fidelity jeśli treść może być zła"
      };
      report.skipped.push(item);
      report.conflicts.push(item);
      report.counts.skipped += 1;
      report.counts.conflicts += 1;
      continue;
    }

    const isDraft = isGalleryOrShort(article);
    const status: Status = isDraft ? "draft" : "published";
    const media = await resolveMedia(article);
    for (const message of media.warnings) {
      report.warnings.push({ slug: article.slug, message });
    }

    const content = await composeMdxFromImport(article, { preserveStatus: status });
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");

    report.created.push({
      slug: article.slug,
      title: article.title,
      category,
      status,
      target: path.relative(ROOT, target).replace(/\\/g, "/")
    });
    report.counts.created += 1;
    report.counts[status] += 1;
  }

  report.counts.warnings = report.warnings.length;
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("CMS integration complete");
  console.log(JSON.stringify(report.counts, null, 2));
  console.log(path.relative(ROOT, REPORT_PATH));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
