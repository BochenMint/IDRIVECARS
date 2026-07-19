/**
 * Gallery helpers — prefer prebuilt manifest (from gallery pipeline),
 * fall back to scanning public/galleries on disk.
 */
import fs from 'node:fs';
import path from 'node:path';

export type GalleryImage = {
  src: string;
  alt: string;
};

const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif']);

type ManifestType = Record<string, Array<{ src: string; alt: string }>>;

function loadManifest(): ManifestType | null {
  const candidates = [
    path.join(process.cwd(), 'src', 'data', 'galleries-manifest.json'),
    path.join(process.cwd(), 'data', 'galleries-manifest.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as ManifestType;
    } catch {
      /* ignore corrupt manifest */
    }
  }
  return null;
}

function resolveGalleriesRoot(): string | null {
  const candidates = [
    path.join(process.cwd(), 'public', 'galleries'),
    path.join(process.cwd(), '..', 'public', 'galleries'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function slugFromGalleryDir(galleryDir?: string): string | null {
  if (!galleryDir) return null;
  const slug = galleryDir.replace(/^galleries[\\/]/, '').replace(/\\/g, '/').trim();
  return slug || null;
}

function scanDisk(slug: string): GalleryImage[] {
  const root = resolveGalleriesRoot();
  if (!root) return [];

  const dir = path.join(root, slug);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .sort();

  return files.map((file) => ({
    src: `/galleries/${slug}/${file}`,
    alt: file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
  }));
}

export function getGalleryImages(galleryDir?: string): GalleryImage[] {
  const slug = slugFromGalleryDir(galleryDir);
  if (!slug) return [];

  const manifest = loadManifest();
  if (manifest && Array.isArray(manifest[slug]) && manifest[slug].length > 0) {
    return manifest[slug];
  }

  return scanDisk(slug);
}

export function getFirstGalleryImageSrc(galleryDir?: string): string | null {
  const images = getGalleryImages(galleryDir);
  return images[0]?.src ?? null;
}
