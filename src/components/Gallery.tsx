"use client";

import { useCallback, useEffect, useState } from "react";
import type { GalleryImage } from "../lib/content/gallery";

type GalleryProps = {
  images: GalleryImage[];
  dark?: boolean;
};

export function Gallery({ images, dark = false }: GalleryProps) {
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
      <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            className={`relative aspect-[4/3] overflow-hidden ${
              dark ? "bg-neutral-900" : "bg-ink/5"
            }`}
            onClick={() => setActiveIndex(index)}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Zamknij"
            onClick={() => setActiveIndex(null)}
          />
          <button
            type="button"
            className="absolute left-4 z-10 label-mono text-white/60 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ←
          </button>
          <div className="relative z-10 max-h-[90vh] max-w-6xl px-12">
            <img
              src={images[activeIndex].src}
              alt={images[activeIndex].alt}
              className="max-h-[85vh] w-auto object-contain"
            />
            <p className="label-mono mt-4 text-center text-white/40">
              {activeIndex + 1} / {images.length}
            </p>
          </div>
          <button
            type="button"
            className="absolute right-4 z-10 label-mono text-white/60 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            →
          </button>
        </div>
      )}
    </>
  );
}
