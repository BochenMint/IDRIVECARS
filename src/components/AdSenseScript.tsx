"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const ADS_ENABLED = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

function hasMarketingConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("idc-cookie-consent") === "all";
}

/** Ładuje skrypt AdSense dopiero po zgodzie marketingowej (baner cookies). */
export function AdSenseScript() {
  const [loadAds, setLoadAds] = useState(false);

  useEffect(() => {
    if (hasMarketingConsent()) setLoadAds(true);

    const onGranted = () => setLoadAds(true);
    window.addEventListener("idc-consent-granted", onGranted);
    return () => window.removeEventListener("idc-consent-granted", onGranted);
  }, []);

  useEffect(() => {
    if (!loadAds || !ADS_ENABLED) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, [loadAds]);

  if (!ADS_ENABLED || !process.env.NEXT_PUBLIC_ADS_ENABLED || !loadAds) return null;

  return (
    <Script
      id="adsense"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_ENABLED}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
