"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
const CONSENT_KEY = "idc-cookie-consent";
const PRIMARY_ID = GA_ID ?? ADS_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "all";
}

function configureTags(): void {
  if (!PRIMARY_ID || !window.gtag) return;

  window.gtag("consent", "update", {
    analytics_storage: GA_ID ? "granted" : "denied",
    ad_storage: ADS_ID ? "granted" : "denied",
    ad_user_data: ADS_ID ? "granted" : "denied",
    ad_personalization: ADS_ID ? "granted" : "denied"
  });

  if (GA_ID) window.gtag("config", GA_ID, { anonymize_ip: true });
  if (ADS_ID) window.gtag("config", ADS_ID);
}

/** Ładuje gtag.js dopiero po zgodzie użytkownika (baner cookies). */
export function GoogleAnalytics() {
  const [loadTags, setLoadTags] = useState(false);

  useEffect(() => {
    if (hasAnalyticsConsent()) setLoadTags(true);

    const onGranted = () => setLoadTags(true);
    window.addEventListener("idc-consent-granted", onGranted);
    return () => window.removeEventListener("idc-consent-granted", onGranted);
  }, []);

  useEffect(() => {
    if (loadTags) configureTags();
  }, [loadTags]);

  if (!PRIMARY_ID) return null;

  return loadTags ? (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${PRIMARY_ID}`} strategy="afterInteractive" />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {
            analytics_storage: '${GA_ID ? "granted" : "denied"}',
            ad_storage: '${ADS_ID ? "granted" : "denied"}',
            ad_user_data: '${ADS_ID ? "granted" : "denied"}',
            ad_personalization: '${ADS_ID ? "granted" : "denied"}'
          });
        `}
      </Script>
    </>
  ) : null;
}

/** Wywołaj po akceptacji banera — odblokowuje pomiar. */
export function grantAnalyticsConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, "all");
  window.dispatchEvent(new Event("idc-consent-granted"));
}

export function denyAnalyticsConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, "essential");
}
