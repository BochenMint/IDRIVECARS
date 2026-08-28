"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HouseAd } from "@/lib/ads/house-ads";
import { pickHouseAd, resolveSlotProvider, type SlotProvider } from "@/lib/ads/slot-rotation";

type AdFormat = "leaderboard" | "medium-rectangle" | "sidebar-sticky" | "in-article" | "footer";

type AdSlotProps = {
  slotId: string;
  format?: AdFormat;
  className?: string;
  /** Indeks slotu na stronie (0,1,2…) — naprzemienna rotacja Google/house */
  slotIndex?: number;
  /** Klucz strony do stabilnej rotacji (np. slug artykułu lub ścieżka) */
  pageKey?: string;
};

const formatStyles: Record<AdFormat, string> = {
  leaderboard: "min-h-[90px] w-full max-w-[728px]",
  "medium-rectangle": "h-[250px] w-full max-w-[300px]",
  "sidebar-sticky": "h-[250px] w-full max-w-[300px]",
  "in-article": "h-[250px] w-full max-w-[300px]",
  footer: "min-h-[90px] w-full max-w-[728px]"
};

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}
const ADSENSE_SLOTS: Record<string, string | undefined> = {
  "header-billboard": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER,
  "sidebar-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_TOP,
  "sidebar-sticky": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_STICKY,
  "in-article": process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE,
  "in-article-mid": process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE,
  "in-article-end": process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE,
  footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER,
  "between-cards": process.env.NEXT_PUBLIC_ADSENSE_SLOT_BETWEEN_CARDS,
  homepage: process.env.NEXT_PUBLIC_ADSENSE_SLOT_BETWEEN_CARDS
};

function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("idc-cookie-consent") === "all";
}

function HouseAdCard({ ad, format }: { ad: HouseAd; format: AdFormat }) {
  const compact = format === "leaderboard" || format === "footer";

  return (
    <a
      href={ad.href}
      target="_blank"
      rel="noopener sponsored"
      className={`group flex h-full w-full flex-col justify-between border border-ink/10 bg-canvas p-5 transition-colors hover:border-ink/25 ${
        compact ? "min-h-[90px] flex-row items-center gap-6" : ""
      }`}
    >
      <div className={compact ? "min-w-0 flex-1" : ""}>
        <p className="label-mono text-[10px] uppercase tracking-wider text-stone-muted">Partner</p>
        <p className="mt-2 font-display text-lg uppercase tracking-wide text-ink">{ad.brand}</p>
        {!compact && (
          <p className="mt-2 text-sm font-light leading-relaxed text-subtle">{ad.tagline}</p>
        )}
      </div>
      <span className="label-mono mt-3 shrink-0 text-ink/70 underline-offset-2 group-hover:underline">
        {ad.cta} →
      </span>
    </a>
  );
}

function GoogleAdUnit({
  client,
  slot,
  format
}: {
  client: string;
  slot: string;
  format: AdFormat;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current || !hasMarketingConsent()) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ins
      className="adsbygoogle block h-full min-h-[90px] w-full"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format === "leaderboard" || format === "footer" ? "horizontal" : "rectangle"}
      data-full-width-responsive={format === "leaderboard" || format === "footer" ? "true" : undefined}
    />
  );
}

export function AdSlot({
  slotId,
  format = "medium-rectangle",
  className = "",
  slotIndex = 0,
  pageKey = "default"
}: AdSlotProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState(false);

  const adUnitId = ADSENSE_SLOTS[slotId]?.trim();
  const hasAdSenseConfig = Boolean(ADSENSE_CLIENT && adUnitId);
  const provider: SlotProvider = resolveSlotProvider(
    slotId,
    pageKey,
    slotIndex,
    hasAdSenseConfig && consent
  );

  useEffect(() => {
    setConsent(hasMarketingConsent());
    const onGranted = () => setConsent(true);
    window.addEventListener("idc-consent-granted", onGranted);
    return () => window.removeEventListener("idc-consent-granted", onGranted);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const houseAd = pickHouseAd(slotId, pageKey);
  const showGoogle = visible && provider === "google" && hasAdSenseConfig && consent;
  const showHouse = visible && (provider === "house" || !hasAdSenseConfig || !consent);

  if (!showGoogle && !showHouse) {
    return (
      <aside
        ref={rootRef}
        className={`mx-auto flex flex-col items-center justify-center ${formatStyles[format]} ${className}`}
        aria-hidden="true"
      />
    );
  }

  const label = showGoogle ? "Reklama" : "Partner";

  return (
    <aside
      ref={rootRef}
      className={`mx-auto flex w-full flex-col items-center ${formatStyles[format]} ${className}`}
      aria-label={label}
    >
      <span className="mb-2 w-full max-w-[300px] text-center text-[10px] uppercase tracking-wider text-stone-muted">
        {label}
      </span>
      <div className={`w-full overflow-hidden rounded-none bg-neutral-100/60 ${formatStyles[format]}`}>
        {showGoogle ? (
          <GoogleAdUnit client={ADSENSE_CLIENT!} slot={adUnitId!} format={format} />
        ) : (
          <HouseAdCard ad={houseAd} format={format} />
        )}
      </div>
    </aside>
  );
}

/** Link partnerski bez pełnego slotu — np. w stopce admin. */
export function HouseAdLink({ ad }: { ad: HouseAd }) {
  return (
    <Link href={ad.href} target="_blank" rel="noopener sponsored" className="label-mono text-stone-muted hover:text-stone">
      {ad.brand}
    </Link>
  );
}
