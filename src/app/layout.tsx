import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, IBM_Plex_Mono } from "next/font/google";
import {
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL
} from "@/lib/site";
import { AdSenseScript } from "../components/AdSenseScript";
import { CookieConsent } from "../components/CookieConsent";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import "./globals.css";

const bebas = Bebas_Neue({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-display",
  display: "swap"
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
  display: "swap"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`
  },
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_AUTHOR.name, url: SITE_AUTHOR.url }],
  creator: SITE_AUTHOR.name,
  publisher: SITE_AUTHOR.name,
  applicationName: SITE_NAME,
  category: "automotive",
  alternates: {
    types: {
      "application/rss+xml": `${SITE_URL}/feed.xml`
    }
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    locale: "pl_PL",
    siteName: SITE_NAME
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "light"
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pl" className={`${bebas.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="text-body leading-body">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-canvas focus:outline-none"
        >
          Przejdź do treści
        </a>
        <GoogleAnalytics />
        <AdSenseScript />
        <div className="page-shell">
          <SiteHeader />
          <main id="main-content" role="main">
            {children}
          </main>
          <SiteFooter />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
