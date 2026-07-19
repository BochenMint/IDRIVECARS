export type GalleryImage = {
  src: string;
  alt: string;
};

/** Manifest galerii generowany przez: npm run generate:galleries-manifest (lub prebuild). */
import manifest from "@/data/galleries-manifest.json";

type ManifestType = Record<string, Array<{ src: string; alt: string }>>;
const galleries = manifest as ManifestType;

function slugFromGalleryDir(galleryDir: string | undefined): string | null {
  if (!galleryDir) return null;
  const slug = galleryDir.replace(/^galleries[\\/]/, "").replace(/\\/g, "/").trim();
  return slug || null;
}

export async function getGalleryImages(galleryDir: string | undefined): Promise<GalleryImage[]> {
  const slug = slugFromGalleryDir(galleryDir);
  if (!slug) return [];
  const list = galleries[slug];
  return Array.isArray(list) ? list : [];
}

export async function getFirstGalleryImageSrc(galleryDir: string | undefined): Promise<string | null> {
  const images = await getGalleryImages(galleryDir);
  return images[0]?.src ?? null;
}
