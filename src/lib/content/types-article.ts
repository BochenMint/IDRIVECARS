import type { ArticleCategory } from "./categories";

export type PublicationStatus = "draft" | "published" | "archived";

/** Skąd pochodzi treść — dla audytu importu i drugiego workera. */
export type ImportProvenance = {
  source?: "autogaleria" | "local" | "manual" | "rss" | "press_portal" | "import-worker";
  importedAt?: string;
  sourceId?: string;
  sourceFile?: string;
};

export type ArticleMeta = {
  slug: string;
  title: string;
  category: ArticleCategory;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  lead?: string;
  status: PublicationStatus;
  seoTitle?: string;
  seoDescription?: string;
  /** Kanoniczny URL (pełny); gdy brak — budowany z domeny + ścieżki kategorii. */
  canonicalUrl?: string;
  originalUrl?: string;
  heroImage?: string;
  galleryDir?: string;
  tags?: string[];
  brand?: string;
  model?: string;
  generation?: string;
  year?: number;
  version?: string;
  bodyType?: string;
  drivetrain?: string;
  engine?: string;
  power?: string;
  torque?: string;
  gearbox?: string;
  headline?: string;
  heroVideoUrl?: string;
  heroVideoPoster?: string;
  videoUrl?: string;
  import?: ImportProvenance;
  /** Katalog źródłowy pliku (testy | blog | felieton). */
  contentDir?: string;
};

export type Article = {
  meta: ArticleMeta;
  contentHtml: string;
  /** Artykuł tapetowy — shortcode `[wallpapers]` w treści MDX. */
  wallpapers?: boolean;
};

export type ContentValidationIssue = {
  slug: string;
  file: string;
  level: "error" | "warning";
  field?: string;
  message: string;
};
