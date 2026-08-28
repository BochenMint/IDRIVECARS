"use client";

/**
 * Slot reklamowy – lazy-loaded, z etykietą "Reklama".
 * Docelowo: wstrzyknąć skrypt AdSense lub kod z panelu admin (np. program partnerski).
 *
 * Dopóki żadna sieć reklamowa nie jest podpięta, slot nie renderuje nic (fallback
 * z docs/PLAN-REKLAMY-I-NEWS.md: "gdy brak kampanii: puste miejsce") – zamiast
 * pokazywać odwiedzającym szary placeholder z widocznym ID slotu.
 */
type AdSlotProps = {
  /** Identyfikator slotu (np. header-billboard, sidebar-top) – do mapowania na ID jednostki reklamowej. */
  slotId: string;
  /** Format wizualny (klasa Tailwind). Domyślnie 300×250. */
  format?: "leaderboard" | "medium-rectangle" | "sidebar-sticky" | "in-article" | "footer";
  className?: string;
};

const formatStyles: Record<NonNullable<AdSlotProps["format"]>, string> = {
  leaderboard: "min-h-[90px] w-full max-w-[728px] mx-auto",
  "medium-rectangle": "h-[250px] w-[300px]",
  "sidebar-sticky": "h-[250px] w-[300px]",
  "in-article": "h-[250px] w-[300px] mx-auto",
  footer: "min-h-[90px] w-full max-w-[728px] mx-auto"
};

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
const ADSENSE_SLOTS: Record<string, string | undefined> = {
  "header-billboard": process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER,
  "sidebar-top": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_TOP,
  "sidebar-sticky": process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_STICKY,
  "in-article": process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE,
  footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER,
  "between-cards": process.env.NEXT_PUBLIC_ADSENSE_SLOT_BETWEEN_CARDS
};

export function AdSlot({ slotId, format = "medium-rectangle", className = "" }: AdSlotProps) {
  if (!ADS_ENABLED) return null;

  const adUnitId = ADSENSE_SLOTS[slotId]?.trim();
  const hasAdSense = Boolean(ADSENSE_CLIENT && adUnitId);

  return (
    <aside
      className={`flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100/80 ${formatStyles[format]} ${className}`}
      aria-label="Reklama"
    >
      <span className="mb-2 text-[10px] uppercase tracking-wider text-neutral-400">Reklama</span>
      {hasAdSense ? (
        <ins
          className="adsbygoogle block w-full"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={adUnitId}
          data-ad-format={format === "leaderboard" || format === "footer" ? "horizontal" : "rectangle"}
          data-full-width-responsive={format === "leaderboard" || format === "footer" ? "true" : undefined}
        />
      ) : (
        <div
          data-ad-slot={slotId}
          data-ad-format={format}
          className="flex h-full min-h-[90px] w-full items-center justify-center text-center text-xs text-neutral-500"
        >
          Slot: {slotId}
        </div>
      )}
    </aside>
  );
}
