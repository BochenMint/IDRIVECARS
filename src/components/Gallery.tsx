"use client";

import { useCallback, useEffect, useState } from "react";
import type { GalleryImage } from "../lib/content/gallery";

type GalleryProps = {
  images: GalleryImage[];
};

export function Gallery({ images }: GalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % images.length));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveIndex(null);
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, goNext, goPrev]);

  if (!images.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            className="group relative aspect-[4/3] overflow-hidden rounded-md bg-neutral-100 focus-visible:ring-2 focus-visible:ring-ink"
            onClick={() => setActiveIndex(index)}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Podgląd zdjęcia"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-zoom-out"
            aria-label="Zamknij galerię"
            onClick={() => setActiveIndex(null)}
          />
          <button
            type="button"
            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
            aria-label="Poprzednie zdjęcie"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ‹
          </button>
          <div className="relative z-10 max-h-full max-w-6xl">
            <img
              src={images[activeIndex].src}
              alt={images[activeIndex].alt}
              className="h-auto max-h-[90vh] w-full rounded-sm object-contain"
            />
            <p className="mt-3 text-center text-xs text-white/70">
              {activeIndex + 1} / {images.length}
            </p>
          </div>
          <button
            type="button"
            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
            aria-label="Następne zdjęcie"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
