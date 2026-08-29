import Image from "next/image";
import type { GalleryImage } from "@/lib/content/gallery";
import { wallpaperDownloadsForImage } from "@/lib/content/wallpapers";

type WallpapersSectionProps = {
  images: GalleryImage[];
  title?: string;
};

export function WallpapersSection({ images, title }: WallpapersSectionProps) {
  if (!images.length) return null;

  return (
    <section
      className="reveal-section bg-ink px-gutter py-24 md:py-32"
      aria-label="Tapety na pulpit"
    >
      <header className="mb-12 max-w-3xl">
        <h2 className="label-mono text-stone/55">Tapety · {images.length} ujęć</h2>
        {title && (
          <p className="mt-4 text-sm font-light text-stone/70">
            Pobierz w rozdzielczościach Full HD i mniejszych — pliki WebP z naszego testu
            {title ? `: ${title}` : ""}.
          </p>
        )}
      </header>

      <ul className="mx-auto grid max-w-5xl gap-10">
        {images.map((image, index) => {
          const downloads = wallpaperDownloadsForImage(image.src, image.srcSet);
          const previewSrc =
            downloads.find((d) => d.width === 1200)?.href ??
            downloads.find((d) => d.width === 800)?.href ??
            image.src;

          return (
            <li
              key={image.src}
              className="overflow-hidden border border-stone/15 bg-black/40"
            >
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src={previewSrc}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 960px"
                  className="object-cover"
                  priority={index < 2}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone/15 px-5 py-4">
                <p className="label-mono text-stone/50">
                  {index + 1} / {images.length}
                </p>
                <div className="flex flex-wrap gap-2">
                  {downloads.map((d) => (
                    <a
                      key={`${image.src}-${d.width}`}
                      href={d.href}
                      download
                      className="label-mono border border-stone/25 px-3 py-1.5 text-stone/80 transition-colors hover:border-stone/50 hover:text-white"
                    >
                      {d.label}
                    </a>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
