export type TestMeta = {
  slug: string;
  title: string;
  brand: string;
  model: string;
  generation?: string;
  year?: number;
  version?: string;
  publishedAt: string;
  lead?: string;
  originalUrl?: string;
  heroImage?: string;
  galleryDir?: string;
  tags?: string[];
  bodyType?: string;
  drivetrain?: string;
  engine?: string;
  power?: string;
  torque?: string;
  gearbox?: string;
  headline?: string;
  /** Krótki klip wideo (hero, 720p, muted) — ścieżka względna od /public, np. /videos/amg-gt-s-drift.mp4 */
  heroVideoUrl?: string;
  /** Poster frame dla heroVideoUrl (fallback gdy wideo nie ładuje się). */
  heroVideoPoster?: string;
  /** Pełny film do odtwarzacza w artykule. */
  videoUrl?: string;
};

export type Test = {
  meta: TestMeta;
  contentHtml: string;
};

