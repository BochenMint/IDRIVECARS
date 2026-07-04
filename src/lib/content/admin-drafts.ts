import { existsSync } from "node:fs";
import path from "node:path";
import { getAllArticleMetas } from "./articles";
import { articlePublicPath, CATEGORY_LABELS, type ArticleCategory } from "./categories";
import { getAllNewsItems } from "./news";
import type { PublicationStatus } from "./types-article";

export type ContentDraftItem = {
  slug: string;
  title: string;
  category: ArticleCategory;
  status: PublicationStatus;
  contentDir: string;
  filePath: string;
  publicPath: string;
  reasons: string[];
};

function galleryExists(galleryDir?: string): boolean {
  if (!galleryDir?.trim()) return false;
  const gallerySlug = galleryDir.replace(/^galleries[\\/]/, "").split(/[\\/]/)[0];
  return existsSync(path.join(process.cwd(), "public", "galleries", gallerySlug));
}

function inferDraftReasons(meta: {
  status: PublicationStatus;
  category: ArticleCategory;
  galleryDir?: string;
  heroImage?: string;
  import?: { source?: string };
  slug: string;
}): string[] {
  const reasons: string[] = [];

  if (meta.status === "draft") {
    reasons.push("status: draft w frontmatter — celowo ukryty przed publikacją");
  }
  if (meta.status === "archived") {
    reasons.push("status: archived — archiwum, nie na liście publicznej");
  }

  const isTextOnly = meta.category === "blog" || meta.category === "felieton";
  const hasMedia =
    Boolean(meta.galleryDir?.trim()) || Boolean(meta.heroImage?.trim());

  if (meta.import?.source && !isTextOnly && !hasMedia) {
    reasons.push("import autoGALERIA bez galleryDir/heroImage — wymaga spięcia mediów");
  }

  if (meta.galleryDir?.trim() && !galleryExists(meta.galleryDir)) {
    reasons.push(
      `brak folderu public/galleries dla galleryDir: ${meta.galleryDir}`
    );
  }

  if (meta.heroImage?.trim()) {
    const heroPath = meta.heroImage.startsWith("/")
      ? path.join(process.cwd(), "public", meta.heroImage.slice(1))
      : path.join(process.cwd(), "public", meta.heroImage);
    if (!existsSync(heroPath)) {
      reasons.push(`brak pliku heroImage: ${meta.heroImage}`);
    }
  }

  if (meta.slug === "bmw-328i-xdrive") {
    reasons.push("audyt Pass 7: brak galerii F30 — wymaga ręcznego mapowania zdjęć");
  }

  if (reasons.length === 0) {
    reasons.push("oznaczony jako draft — sprawdź frontmatter i docs/PUBLISHING-CHECKLIST.md");
  }

  return reasons;
}

/** Szkice MDX (testy, blog, felieton) — tylko odczyt, bez publikacji z panelu. */
export async function getContentDraftItems(): Promise<ContentDraftItem[]> {
  const metas = await getAllArticleMetas({ includeDrafts: true });
  const drafts = metas.filter((m) => m.status === "draft" || m.status === "archived");

  return drafts.map((meta) => {
    const contentDir = meta.contentDir ?? "testy";
    return {
      slug: meta.slug,
      title: meta.title,
      category: meta.category,
      status: meta.status,
      contentDir,
      filePath: `content/${contentDir}/${meta.slug}.mdx`,
      publicPath: articlePublicPath(meta.category, meta.slug),
      reasons: inferDraftReasons(meta)
    };
  });
}

export type NewsDraftItem = {
  slug: string;
  title: string;
  status: string;
  filePath: string;
  publicPath: string;
  reasons: string[];
};

/** Szkice newsów MDX (status !== published). Pipeline RSS → /admin/news/review. */
export async function getNewsDraftItems(): Promise<NewsDraftItem[]> {
  const items = await getAllNewsItems(500);
  return items
    .filter((item) => item.status !== "published")
    .map((item) => {
      const reasons: string[] = [];
      if (item.status === "draft") {
        reasons.push("status: draft — import aG lub oczekuje na review");
      } else if (item.status === "review") {
        reasons.push("status: review — wymaga decyzji redakcyjnej");
      } else {
        reasons.push(`status: ${item.status}`);
      }
      if (!item.image?.trim()) {
        reasons.push("brak lokalnego heroImage — martwe linki aG w treści");
      }
      return {
        slug: item.slug,
        title: item.title,
        status: item.status ?? "draft",
        filePath: `content/news/${item.slug}.mdx`,
        publicPath: `/news/${item.slug}`,
        reasons
      };
    });
}

export { CATEGORY_LABELS };
