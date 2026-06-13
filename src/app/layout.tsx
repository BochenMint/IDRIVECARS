import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { AdSlot } from "../components/AdSlot";
import { JsonLd } from "../components/JsonLd";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { organizationSchema, websiteSchema } from "../lib/seo";
import { siteConfig } from "../lib/site";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap"
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-display",
  display: "swap"
});

function AdBanner() {
  return (
    <div className="border-b border-neutral-100 bg-neutral-50/50 px-4 py-2 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdSlot slotId="header-billboard" format="leaderboard" />
      </div>
    </div>
  );
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.name,
  alternates: {
    canonical: "/"
  },
  category: "Motoryzacja",
  formatDetection: {
    email: false,
    telephone: false,
    address: false
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    creator: `@${siteConfig.name.toLowerCase()}`
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
  }
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
    <html lang="pl" className={`h-full scroll-smooth ${dmSans.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-full bg-surface text-ink antialiased font-sans">
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <a href="#main-content" className="skip-link">
          Przejdź do treści
        </a>
        <div className="page-shell">
          <SiteHeader />
          <AdBanner />
          <main id="main-content" className="page-main" role="main">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
