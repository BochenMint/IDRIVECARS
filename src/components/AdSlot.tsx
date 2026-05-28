"use client";

/**
 * Slot reklamowy – lazy-loaded, z etykietą "Reklama".
 * Docelowo: wstrzyknąć skrypt AdSense lub kod z panelu admin (np. program partnerski).
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

export function AdSlot({ slotId, format = "medium-rectangle", className = "" }: AdSlotProps) {
  return (
    <aside
      className={`flex flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100/80 ${formatStyles[format]} ${className}`}
      aria-label="Reklama"
    >
      <span className="mb-2 text-[10px] uppercase tracking-wider text-neutral-400">Reklama</span>
      {/* Placeholder pod AdSense / program partnerski – docelowo dangerouslySetInnerHTML lub iframe z ad servera */}
      <div
        data-ad-slot={slotId}
        data-ad-format={format}
        className="flex h-full min-h-[90px] w-full items-center justify-center text-center text-xs text-neutral-500"
      >
        Slot: {slotId}
      </div>
    </aside>
  );
}
