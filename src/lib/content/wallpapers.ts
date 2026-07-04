/**
 * Shortcode `[wallpapers]` z importu autoGALERIA — tapety na pulpit.
 * Treść artykułu jest pusta poza shortcode; zdjęcia pochodzą z galleryDir.
 */

const SHORTCODE_LINE_RE =
  /(?:^|\n)\s*\\?\[wallpapers(?:\s+date=(?:"[^"]*"|'[^']*'))?\s*\\?\]\s*(?:\n|$)/gi;

const SHORTCODE_INLINE_RE = /\\?\[wallpapers(?:\s+date=(?:"[^"]*"|'[^']*'))?\s*\\?\]/gi;

export function hasWallpapersShortcode(markdown: string): boolean {
  return /\\?\[wallpapers(?:\s+date=(?:"[^"]*"|'[^']*'))?\s*\\?\]/i.test(markdown);
}

/** Usuwa shortcode z markdown przed remark. */
export function removeWallpapersShortcode(markdown: string): string {
  return markdown.replace(SHORTCODE_LINE_RE, "\n").replace(SHORTCODE_INLINE_RE, "").trim();
}

/** Usuwa artefakt HTML po remark (np. <p>[wallpapers …]</p>). */
export function stripWallpapersFromHtml(html: string): string {
  return html
    .replace(/<p>\s*(?:\\)?\[wallpapers[^\]]*\]\s*<\/p>/gi, "")
    .replace(SHORTCODE_INLINE_RE, "")
    .trim();
}

export type WallpaperDownload = {
  label: string;
  href: string;
  width: number;
};

/** Mapowanie wariantów WebP na etykiety rozdzielczości z autoGALERII. */
const WIDTH_LABELS: Array<{ width: number; label: string }> = [
  { width: 1920, label: "1920×1080" },
  { width: 1200, label: "1366×768" },
  { width: 800, label: "1280×800" }
];

function parseSrcSet(srcSet: string): Array<{ url: string; width: number }> {
  return srcSet
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      const space = trimmed.lastIndexOf(" ");
      if (space <= 0) return null;
      const url = trimmed.slice(0, space);
      const widthToken = trimmed.slice(space + 1);
      const width = parseInt(widthToken.replace(/w$/i, ""), 10);
      if (!url || Number.isNaN(width)) return null;
      return { url, width };
    })
    .filter((v): v is { url: string; width: number } => v !== null);
}

/** Linki pobrania dla jednego zdjęcia galerii (responsive WebP). */
export function wallpaperDownloadsForImage(
  src: string,
  srcSet?: string
): WallpaperDownload[] {
  const variants = srcSet ? parseSrcSet(srcSet) : [];
  const byWidth = new Map(variants.map((v) => [v.width, v.url]));

  const downloads: WallpaperDownload[] = [];
  for (const { width, label } of WIDTH_LABELS) {
    const href = byWidth.get(width) ?? (width === 1920 ? src : undefined);
    if (href) downloads.push({ label, href, width });
  }

  if (downloads.length === 0) {
    downloads.push({ label: "Pobierz", href: src, width: 1920 });
  }

  return downloads;
}
