import type { Metadata } from "next";
import { Bebas_Neue, Inter, IBM_Plex_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
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
    default: "IDRIVECARS",
    template: "%s · IDRIVECARS"
  },
  description:
    "Autorskie testy samochodów, pierwsze jazdy i galerie zdjęć Marcina Bochenka.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "IDRIVECARS",
    description: "Testy samochodów. Własne zdjęcia. Bez hałasu.",
    type: "website",
    url: SITE_URL,
    locale: "pl_PL",
    siteName: "IDRIVECARS"
  },
  twitter: {
    card: "summary_large_image",
    title: "IDRIVECARS",
    description: "Testy samochodów. Własne zdjęcia. Bez hałasu."
  },
  robots: { index: true, follow: true }
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pl" className={`${bebas.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <div className="page-shell">
          <SiteHeader />
          <main role="main">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
