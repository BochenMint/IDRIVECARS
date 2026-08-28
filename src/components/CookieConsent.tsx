"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { denyAnalyticsConsent, grantAnalyticsConsent } from "./GoogleAnalytics";

const CONSENT_KEY = "idc-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);

    const onGranted = () => setVisible(false);
    window.addEventListener("idc-consent-granted", onGranted);
    return () => window.removeEventListener("idc-consent-granted", onGranted);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Zgoda na pliki cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-soft bg-canvas/95 px-gutter py-5 shadow-lg backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-light leading-relaxed text-ink/80">
          Używamy plików cookies do statystyk i reklam. Szczegóły w{" "}
          <Link href="/cookies" className="text-ink underline underline-offset-4 hover:opacity-80">
            polityce cookies
          </Link>{" "}
          i{" "}
          <Link href="/polityka-prywatnosci" className="text-ink underline underline-offset-4 hover:opacity-80">
            polityce prywatności
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              denyAnalyticsConsent();
              setVisible(false);
            }}
            className="label-mono rounded border border-soft px-4 py-2 text-stone-muted transition-colors hover:border-ink/20 hover:text-ink"
          >
            Tylko niezbędne
          </button>
          <button
            type="button"
            onClick={() => {
              grantAnalyticsConsent();
              setVisible(false);
            }}
            className="label-mono rounded bg-ink px-4 py-2 text-canvas transition-opacity hover:opacity-85"
          >
            Akceptuję
          </button>
        </div>
      </div>
    </div>
  );
}
