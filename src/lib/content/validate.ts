import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isArticleCategory } from "./categories";
import { listArticleFiles } from "./articles";
import type { ContentValidationIssue } from "./types-article";
import {
  isAbsurdProsCons,
  PROS_CONS_MAX_ITEM_LENGTH
} from "../../../scripts/lib/autogaleria-import/pros-cons";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readArticleFile(
  contentDir: string,
  slug: string
): Promise<{ data: Record<string, unknown>; content: string; filePath: string }> {
  const dir = path.join(process.cwd(), "content", contentDir);
  const mdx = path.join(dir, `${slug}.mdx`);
  const md = path.join(dir, `${slug}.md`);
  const filePath = existsSync(mdx) ? mdx : md;
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  return { data: parsed.data as Record<string, unknown>, content: parsed.content, filePath };
}

export async function validateAllContent(): Promise<ContentValidationIssue[]> {
  const issues: ContentValidationIssue[] = [];
  const slugIndex = new Map<string, string>();
  const files = await listArticleFiles();

  for (const { slug, contentDir } of files) {
    const relFile = `content/${contentDir}/${slug}.mdx`;

    if (!SLUG_RE.test(slug)) {
      issues.push({
        slug,
        file: relFile,
        level: "error",
        field: "slug",
        message: "Slug musi być małymi literami, cyframi i myślnikami (bez polskich znaków)."
      });
    }

    const prev = slugIndex.get(slug);
    if (prev && prev !== contentDir) {
      issues.push({
        slug,
        file: relFile,
        level: "error",
        field: "slug",
        message: `Duplikat sluga w content/${prev} i content/${contentDir}.`
      });
    } else {
      slugIndex.set(slug, contentDir);
    }

    let data: Record<string, unknown>;
    let content: string;
    let filePath: string;

    try {
      ({ data, content, filePath } = await readArticleFile(contentDir, slug));
    } catch (e) {
      issues.push({
        slug,
        file: relFile,
        level: "error",
        message: e instanceof Error ? e.message : "Nie można odczytać pliku."
      });
      continue;
    }

    const file = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

    if (typeof data.title !== "string" || !data.title.trim()) {
      issues.push({ slug, file, level: "error", field: "title", message: "Brak tytułu." });
    }

    if (typeof data.publishedAt !== "string" || Number.isNaN(Date.parse(data.publishedAt))) {
      issues.push({
        slug,
        file,
        level: "error",
        field: "publishedAt",
        message: "publishedAt musi być datą ISO (np. 2024-06-15)."
      });
    }

    if (data.category !== undefined) {
      if (typeof data.category !== "string" || !isArticleCategory(data.category)) {
        issues.push({
          slug,
          file,
          level: "error",
          field: "category",
          message: `Nieprawidłowa kategoria. Dozwolone: test, pierwsza-jazda, blog, felieton, news.`
        });
      }
    }

    const category =
      typeof data.category === "string" && isArticleCategory(data.category)
        ? data.category
        : contentDir === "blog"
          ? "blog"
          : contentDir === "felieton"
            ? "felieton"
            : slug.includes("pierwsza-jazda")
              ? "pierwsza-jazda"
              : "test";

    if ((category === "test" || category === "pierwsza-jazda") && !data.brand) {
      issues.push({
        slug,
        file,
        level: "error",
        field: "brand",
        message: "Testy i pierwsze jazdy wymagają pola brand."
      });
    }

    if ((category === "test" || category === "pierwsza-jazda") && !data.model) {
      issues.push({
        slug,
        file,
        level: "error",
        field: "model",
        message: "Testy i pierwsze jazdy wymagają pola model."
      });
    }

    if (!content.trim()) {
      issues.push({
        slug,
        file,
        level: "warning",
        field: "body",
        message: "Pusta treść artykułu (poniżej frontmatter)."
      });
    }

    if (typeof data.seoDescription === "string" && data.seoDescription.length > 170) {
      issues.push({
        slug,
        file,
        level: "warning",
        field: "seoDescription",
        message: "seoDescription dłuższe niż 170 znaków — może być obcięte w SERP."
      });
    }

    if (typeof data.galleryDir === "string" && data.galleryDir.trim()) {
      const gallerySlug = data.galleryDir.replace(/^galleries[\\/]/, "").split(/[\\/]/)[0];
      const galleryPath = path.join(process.cwd(), "public", "galleries", gallerySlug);
      if (!existsSync(galleryPath)) {
        issues.push({
          slug,
          file,
          level: "warning",
          field: "galleryDir",
          message: `Brak folderu public/galleries/${gallerySlug} — uruchom convert:galleries lub popraw galleryDir.`
        });
      }
    }

    if (typeof data.heroImage === "string" && data.heroImage.trim()) {
      const heroPath = data.heroImage.startsWith("/")
        ? path.join(process.cwd(), "public", data.heroImage.slice(1))
        : path.join(process.cwd(), "public", data.heroImage);
      if (!existsSync(heroPath)) {
        issues.push({
          slug,
          file,
          level: "warning",
          field: "heroImage",
          message: `Plik heroImage nie istnieje: ${data.heroImage}`
        });
      }
    }

    for (const field of ["pros", "cons"] as const) {
      const value = data[field];
      if (!value) continue;
      if (!Array.isArray(value)) {
        issues.push({
          slug,
          file,
          level: "error",
          field,
          message: `${field} musi być tablicą krótkich punktów (max ${PROS_CONS_MAX_ITEM_LENGTH} znaków).`
        });
        continue;
      }
      const strings = value.filter((v): v is string => typeof v === "string");
      if (isAbsurdProsCons(strings)) {
        issues.push({
          slug,
          file,
          level: "error",
          field,
          message: `${field} wygląda na zepsute przez import (za długie punkty) — napraw parser lub usuń pole.`
        });
      }
    }

    if (typeof data.status === "string" && data.status === "published") {
      const isImport = data.import && typeof data.import === "object";
      const hasGallery =
        (typeof data.galleryDir === "string" && data.galleryDir.trim()) ||
        (typeof data.heroImage === "string" && data.heroImage.trim());
      const isTextOnlyCategory = category === "felieton" || category === "blog";
      if (isImport && !hasGallery && !isTextOnlyCategory) {
        issues.push({
          slug,
          file,
          level: "warning",
          field: "status",
          message:
            "Import autoGALERIA opublikowany bez galleryDir/heroImage — rozważ status: draft do spięcia mediów."
        });
      }
    }

    if (content.includes("autogaleria.pl") || /\/content\/uploads\//.test(content)) {
      const bodyAgLinks =
        (content.match(/autogaleria\.pl/gi) ?? []).length;
      const onlyEmail = bodyAgLinks > 0 && !/\]\(https?:\/\/[^)]*autogaleria\.pl/.test(content) && !/\]\(\/[^)]*autogaleria/.test(content);
      if (bodyAgLinks && !onlyEmail) {
        issues.push({
          slug,
          file,
          level: "warning",
          field: "body",
          message:
            "Treść zawiera martwe linki/obrazy autogaleria.pl lub /content/uploads/ — uruchom clean:import-links."
        });
      }
    }
  }

  return issues;
}
