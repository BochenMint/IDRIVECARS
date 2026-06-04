"use client";

import Image from "next/image";
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

  const gapClass = dark ? "gap-3" : "gap-4";
  const cellBorder = dark ? "ring-1 ring-stone/15" : "ring-1 ring-line/80";
  const cellBg = dark ? "bg-black" : "bg-ink/5";

  return (
    <>
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${gapClass}`}>
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            className={`relative aspect-[4/3] overflow-hidden ${cellBg} ${cellBorder}`}
            onClick={() => setActiveIndex(index)}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-92 transition-opacity duration-editorial hover:opacity-100 motion-reduce:transition-none"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/97"
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
            className="absolute left-4 z-10 label-mono text-stone/60 transition-opacity duration-editorial hover:opacity-100"
            aria-label="Poprzednie zdjęcie"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            ←
          </button>
          <div className="relative z-10 max-h-[90vh] max-w-6xl px-12">
            {/* eslint-disable-next-line @next/next/no-img-element -- lightbox: dynamic full viewport */}
            <img
              src={images[activeIndex].src}
              alt={images[activeIndex].alt}
              className="max-h-[85vh] w-auto object-contain"
            />
            <p className="label-mono mt-5 text-center text-stone/45">
              {activeIndex + 1} / {images.length}
            </p>
          </div>
          <button
            type="button"
            className="absolute right-4 z-10 label-mono text-stone/60 transition-opacity duration-editorial hover:opacity-100"
            aria-label="Następne zdjęcie"
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
