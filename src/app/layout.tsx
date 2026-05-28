import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { AdSlot } from "../components/AdSlot";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
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
  title: {
    default: "IDRIVECARS – testy samochodów i galerie",
    template: "%s | IDRIVECARS"
  },
  description:
    "IDRIVECARS to autorskie testy samochodów, galerie zdjęć i blog motoryzacyjny Marcina Bochenka.",
  metadataBase: new URL("https://idrivecars.example"), // TODO: podmień na docelową domenę
  openGraph: {
    title: "IDRIVECARS – testy samochodów i galerie",
    description:
      "Autorskie testy samochodów, galerie zdjęć i blog motoryzacyjny Marcina Bochenka.",
    type: "website",
    url: "https://idrivecars.example"
  }
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pl" className={`h-full scroll-smooth ${dmSans.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-full bg-surface text-ink antialiased font-sans">
        <div className="page-shell">
          <SiteHeader />
          <AdBanner />
          <main className="page-main" role="main">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
