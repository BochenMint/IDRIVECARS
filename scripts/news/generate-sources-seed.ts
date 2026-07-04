#!/usr/bin/env npx tsx
/**
 * Generator seedu content/news-catalog/sources.json (official press rooms only).
 * Uruchom: npx tsx scripts/news/generate-sources-seed.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { NewsSourceConfig } from "../../src/lib/news/types";

type Seed = Omit<NewsSourceConfig, "id"> & { id: string };

function src(
  id: string,
  partial: Omit<Seed, "id"> & Partial<Pick<Seed, "enabled">>
): Seed {
  return { id, ...partial };
}

const sources: Seed[] = [
  // ── Volkswagen Group ──────────────────────────────────────────────
  src("volkswagen-group-press", {
    name: "Volkswagen Group Press",
    brands: ["Volkswagen Group"],
    region: "global",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.volkswagen-group.com/en/press-releases",
    pressUrl: "https://www.volkswagen-group.com/en/media-15771",
    loginRequired: false,
    enabled: false,
    verificationStatus: "verified",
    licenseNotes: "Grupa VW — komunikaty korporacyjne i linki do marek."
  }),
  src("volkswagen-newsroom", {
    name: "Volkswagen Newsroom",
    brands: ["Volkswagen"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://www.volkswagen-newsroom.com/en/press-releases",
    pressUrl: "https://www.volkswagen-newsroom.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("vw-commercial-vehicles-press", {
    name: "Volkswagen Commercial Vehicles Press",
    brands: ["Volkswagen Commercial Vehicles"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://www.volkswagen-newsroom.com/en/press-releases",
    pressUrl: "https://www.volkswagen-newsroom.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review",
    licenseNotes: "VWCV — ten sam portal co VW osobowe; filtr marki po rejestracji."
  }),
  src("skoda-storyboard", {
    name: "Škoda Storyboard Press",
    brands: ["Škoda"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.skoda-storyboard.com/en/press-releases/",
    pressUrl: "https://www.skoda-storyboard.com/en/media-room/",
    loginRequired: false,
    enabled: false,
    verificationStatus: "verified",
    maxItemsPerRun: 6,
    licenseNotes: "Oficjalny press room Škody (bez publicznego RSS)."
  }),
  src("seat-mediacenter", {
    name: "SEAT MediaCenter",
    brands: ["SEAT"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://www.seat-mediacenter.com/",
    pressUrl: "https://www.seat-mediacenter.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("cupra-mediacenter", {
    name: "CUPRA MediaCenter",
    brands: ["CUPRA"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://www.seat-cupra-mediacenter.com/",
    pressUrl: "https://www.seat-cupra-mediacenter.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("audi-mediacenter", {
    name: "Audi MediaCenter",
    brands: ["Audi"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://www.audi-mediacenter.com/",
    pressUrl: "https://www.audi-mediacenter.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("porsche-newsroom", {
    name: "Porsche Newsroom",
    brands: ["Porsche"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://newsroom.porsche.com/en/press-releases",
    pressUrl: "https://newsroom.porsche.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified",
    maxItemsPerRun: 6,
    priority: 10
  }),
  src("bentley-media", {
    name: "Bentley Media",
    brands: ["Bentley"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://www.bentleymedia.com/",
    pressUrl: "https://www.bentleymedia.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("lamborghini-news", {
    name: "Lamborghini News",
    brands: ["Lamborghini"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.lamborghini.com/en-en/news",
    pressUrl: "https://www.lamborghini.com/en-en/news",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified",
    selectors: { article: ".news-item, article", title: "h2, h3", link: "a" }
  }),
  src("bugatti-media", {
    name: "Bugatti Media",
    brands: ["Bugatti"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://www.bugatti-newsroom.com/",
    pressUrl: "https://www.bugatti-newsroom.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("ducati-media", {
    name: "Ducati Media",
    brands: ["Ducati"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.ducati.com/ww/en/news",
    pressUrl: "https://www.ducati.com/ww/en/news",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review",
    licenseNotes: "Opcjonalne — motocykle w grupie VW; poza głównym pipeline aut."
  }),

  // ── BMW Group ─────────────────────────────────────────────────────
  src("bmw-press", {
    name: "BMW Group PressClub",
    brands: ["BMW", "MINI", "Rolls-Royce"],
    region: "global",
    sourceType: "requires_login",
    fetchUrl: "https://www.press.bmwgroup.com/global/",
    pressUrl: "https://www.press.bmwgroup.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified",
    maxItemsPerRun: 8,
    priority: 10,
    licenseNotes: "Publiczny RSS bywa niedostępny — wymaga konta PressClub do pełnych materiałów."
  }),

  // ── Mercedes-Benz Group ───────────────────────────────────────────
  src("mercedes-benz-group-press", {
    name: "Mercedes-Benz Group Press",
    brands: ["Mercedes-Benz", "Maybach", "AMG"],
    region: "global",
    sourceType: "newsroom_html",
    fetchUrl: "https://group.mercedes-benz.com/press/",
    pressUrl: "https://group.mercedes-benz.com/press/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified",
    maxItemsPerRun: 6,
    priority: 9,
    licenseNotes: "Pełne materiały: media.mercedes-benz.com (konto wymagane)."
  }),
  src("smart-media-mercedes", {
    name: "smart Media (Mercedes-Benz)",
    brands: ["smart"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://media.mercedes-benz.com/smart",
    pressUrl: "https://media.mercedes-benz.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),

  // ── Stellantis ────────────────────────────────────────────────────
  src("stellantis-corporate-rss", {
    name: "Stellantis Corporate RSS",
    brands: [
      "Stellantis",
      "Peugeot",
      "Citroën",
      "Opel",
      "Fiat",
      "Jeep",
      "Alfa Romeo",
      "Maserati",
      "DS",
      "Lancia",
      "Abarth"
    ],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/corporate/rss",
    pressUrl: "https://www.media.stellantis.com/",
    loginRequired: false,
    enabled: false,
    maxItemsPerRun: 8,
    priority: 10,
    verificationStatus: "needs_review",
    disabledReason: "403 z datacenter/botów — feed istnieje, wymaga allowlist IP lub nagłówków",
    licenseNotes: "Oficjalny RSS Stellantis — włączyć po weryfikacji z produkcji."
  }),
  src("stellantis-fiat-rss", {
    name: "FIAT Press RSS",
    brands: ["Fiat"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/fiat/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/fiat",
    loginRequired: false,
    enabled: false,
    maxItemsPerRun: 6,
    verificationStatus: "verified"
  }),
  src("stellantis-peugeot-rss", {
    name: "Peugeot Press RSS",
    brands: ["Peugeot"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/peugeot/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/peugeot",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-citroen-rss", {
    name: "Citroën Press RSS",
    brands: ["Citroën"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/citroen/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/citroen",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-opel-rss", {
    name: "Opel Press RSS",
    brands: ["Opel", "Vauxhall"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/opel/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/opel",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-jeep-rss", {
    name: "Jeep Press RSS",
    brands: ["Jeep"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/jeep/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/jeep",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-alfa-romeo-rss", {
    name: "Alfa Romeo Press RSS",
    brands: ["Alfa Romeo"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/alfa-romeo/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/alfa-romeo",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-maserati-rss", {
    name: "Maserati Press RSS",
    brands: ["Maserati"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/maserati/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/maserati",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-ds-rss", {
    name: "DS Automobiles Press RSS",
    brands: ["DS"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/ds/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/ds",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-lancia-rss", {
    name: "Lancia Press RSS",
    brands: ["Lancia"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/lancia/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/lancia",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-abarth-rss", {
    name: "Abarth Press RSS",
    brands: ["Abarth"],
    region: "EU",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/em-en/abarth/rss",
    pressUrl: "https://www.media.stellantis.com/em-en/abarth",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-chrysler-rss", {
    name: "Chrysler Press RSS",
    brands: ["Chrysler"],
    region: "US",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/us-en/chrysler/rss",
    pressUrl: "https://www.media.stellantis.com/us-en/chrysler",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-dodge-rss", {
    name: "Dodge Press RSS",
    brands: ["Dodge"],
    region: "US",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/us-en/dodge/rss",
    pressUrl: "https://www.media.stellantis.com/us-en/dodge",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("stellantis-ram-rss", {
    name: "Ram Press RSS",
    brands: ["Ram"],
    region: "US",
    sourceType: "rss",
    fetchUrl: "https://www.media.stellantis.com/us-en/ram/rss",
    pressUrl: "https://www.media.stellantis.com/us-en/ram",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),

  // ── Renault Group ─────────────────────────────────────────────────
  src("renault-group-press", {
    name: "Renault Group Media",
    brands: ["Renault", "Dacia", "Alpine", "Mobilize"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://media.renaultgroup.com/?lang=eng",
    pressUrl: "https://media.renaultgroup.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified",
    maxItemsPerRun: 6
  }),

  // ── Toyota / Japanese ─────────────────────────────────────────────
  src("toyota-pressroom-rss", {
    name: "Toyota USA Pressroom RSS",
    brands: ["Toyota", "Lexus"],
    region: "US",
    sourceType: "rss",
    fetchUrl: "https://pressroom.toyota.com/feed/",
    pressUrl: "https://pressroom.toyota.com/",
    loginRequired: false,
    enabled: true,
    maxItemsPerRun: 8,
    priority: 9,
    verificationStatus: "verified"
  }),
  src("toyota-global-rss", {
    name: "Toyota Motor Corporation Global RSS",
    brands: ["Toyota"],
    region: "JP",
    sourceType: "rss",
    fetchUrl: "https://global.toyota/export/en/allnews_rss.xml",
    pressUrl: "https://global.toyota/en/newsroom/",
    loginRequired: false,
    enabled: true,
    maxItemsPerRun: 8,
    priority: 8,
    verificationStatus: "verified",
    licenseNotes: "Globalny feed korporacyjny — inny zakres niż pressroom.toyota.com."
  }),
  src("honda-news-eu", {
    name: "Honda News Europe",
    brands: ["Honda"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://hondanews.eu/",
    pressUrl: "https://hondanews.eu/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("honda-global-news", {
    name: "Honda Global Newsroom",
    brands: ["Honda"],
    region: "JP",
    sourceType: "newsroom_html",
    fetchUrl: "https://global.honda/newsroom/",
    pressUrl: "https://global.honda/newsroom/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("acura-news", {
    name: "Acura Newsroom",
    brands: ["Acura"],
    region: "US",
    sourceType: "newsroom_html",
    fetchUrl: "https://acuranews.com/en-US",
    pressUrl: "https://acuranews.com/",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("nissan-global-news", {
    name: "Nissan Global Newsroom",
    brands: ["Nissan", "Infiniti"],
    region: "global",
    sourceType: "newsroom_html",
    fetchUrl: "https://global.nissannews.com/",
    pressUrl: "https://global.nissannews.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("mazda-newsroom", {
    name: "Mazda Newsroom",
    brands: ["Mazda"],
    region: "global",
    sourceType: "newsroom_html",
    fetchUrl: "https://newsroom.mazda.com/",
    pressUrl: "https://newsroom.mazda.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("subaru-media", {
    name: "Subaru U.S. Media Center",
    brands: ["Subaru"],
    region: "US",
    sourceType: "newsroom_html",
    fetchUrl: "https://media.subaru.com/newsroom.do",
    pressUrl: "https://media.subaru.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("mitsubishi-motors-news", {
    name: "Mitsubishi Motors News",
    brands: ["Mitsubishi"],
    region: "JP",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.mitsubishi-motors.com/en/news/index.html",
    pressUrl: "https://www.mitsubishi-motors.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("suzuki-global-news", {
    name: "Suzuki Global News",
    brands: ["Suzuki"],
    region: "JP",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.globalsuzuki.com/corporate/news/",
    pressUrl: "https://www.globalsuzuki.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("isuzu-news", {
    name: "Isuzu Global News",
    brands: ["Isuzu"],
    region: "JP",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.isuzu.co.jp/world/news/",
    pressUrl: "https://www.isuzu.co.jp/world/news/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("daihatsu-news", {
    name: "Daihatsu Global News",
    brands: ["Daihatsu"],
    region: "JP",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.daihatsu.com/news/",
    pressUrl: "https://www.daihatsu.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review",
    licenseNotes: "Część grupy Toyota."
  }),

  // ── Korean ────────────────────────────────────────────────────────
  src("hyundai-news", {
    name: "Hyundai Newsroom",
    brands: ["Hyundai"],
    region: "global",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.hyundainews.com/en-US/releases",
    pressUrl: "https://www.hyundainews.com/",
    loginRequired: false,
    enabled: false,
    maxItemsPerRun: 8,
    priority: 9,
    verificationStatus: "verified"
  }),
  src("kia-news-center", {
    name: "Kia News Center",
    brands: ["Kia"],
    region: "KR",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.kianewscenter.com/",
    pressUrl: "https://www.kianewscenter.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("genesis-news", {
    name: "Genesis News",
    brands: ["Genesis"],
    region: "KR",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.genesisnews.com/",
    pressUrl: "https://www.genesisnews.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("kg-mobility-press", {
    name: "KGM (KG Mobility)",
    brands: ["KGM", "SsangYong"],
    region: "KR",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.kg-mobility.com/eng/pr/press/list.do",
    pressUrl: "https://www.kg-mobility.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),

  // ── US OEM + EV startups ──────────────────────────────────────────
  src("ford-media-rss", {
    name: "Ford Media RSS (All Releases)",
    brands: ["Ford", "Lincoln"],
    region: "US",
    sourceType: "rss",
    fetchUrl: "https://media.ford.com/content/fordmedia/fna/us/en/rss/all.rss",
    pressUrl: "https://media.ford.com/",
    loginRequired: false,
    enabled: false,
    maxItemsPerRun: 8,
    verificationStatus: "needs_review",
    licenseNotes: "Ford udostępnia kanały RSS na media.ford.com — URL do weryfikacji."
  }),
  src("gm-news", {
    name: "General Motors Newsroom",
    brands: ["Chevrolet", "Cadillac", "GMC", "Buick"],
    region: "US",
    sourceType: "newsroom_html",
    fetchUrl: "https://news.gm.com/",
    pressUrl: "https://news.gm.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("tesla-press", {
    name: "Tesla Press",
    brands: ["Tesla"],
    region: "global",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.tesla.com/about/press",
    pressUrl: "https://www.tesla.com/about/press",
    loginRequired: false,
    enabled: false,
    maxItemsPerRun: 5,
    verificationStatus: "verified"
  }),
  src("rivian-newsroom", {
    name: "Rivian Newsroom",
    brands: ["Rivian"],
    region: "US",
    sourceType: "newsroom_html",
    fetchUrl: "https://rivian.com/newsroom",
    pressUrl: "https://rivian.com/newsroom",
    loginRequired: false,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("lucid-media", {
    name: "Lucid Media Room",
    brands: ["Lucid"],
    region: "US",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.lucidmotors.com/media-room",
    pressUrl: "https://www.lucidmotors.com/media-room",
    loginRequired: false,
    enabled: false,
    verificationStatus: "verified"
  }),

  // ── Chinese / global EV ───────────────────────────────────────────
  src("byd-global", {
    name: "BYD Global News",
    brands: ["BYD"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.byd.com/global/news",
    pressUrl: "https://www.byd.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("geely-global-news", {
    name: "Geely Global News",
    brands: ["Geely"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.geely.com/global/news/",
    pressUrl: "https://www.geely.com/global/news/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("zeekr-media", {
    name: "Zeekr Media",
    brands: ["Zeekr"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.zeekrlife.com/news",
    pressUrl: "https://www.zeekrlife.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("lynk-co-media", {
    name: "Lynk & Co Press",
    brands: ["Lynk & Co"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.lynkco.com/en/news",
    pressUrl: "https://www.lynkco.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("volvo-cars-media", {
    name: "Volvo Cars Media",
    brands: ["Volvo"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.media.volvocars.com/global/en-gb/media/pressreleases",
    pressUrl: "https://www.media.volvocars.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("polestar-media", {
    name: "Polestar Media",
    brands: ["Polestar"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://media.polestar.com/",
    pressUrl: "https://media.polestar.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("lotus-media", {
    name: "Lotus Cars Media",
    brands: ["Lotus"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://media.lotuscars.com/",
    pressUrl: "https://media.lotuscars.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("smart-global-geely", {
    name: "smart Press (Geely)",
    brands: ["smart"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.smart.com/global/en/press",
    pressUrl: "https://www.smart.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review",
    licenseNotes: "Marka smart (Geely) — odróżniać od smart w Mercedes-Benz Group."
  }),
  src("nio-news", {
    name: "NIO News",
    brands: ["NIO"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.nio.com/news",
    pressUrl: "https://www.nio.com/news",
    loginRequired: false,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("xpeng-news", {
    name: "XPeng News",
    brands: ["XPeng"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.xpeng.com/news",
    pressUrl: "https://www.xpeng.com/news",
    loginRequired: false,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("li-auto-news", {
    name: "Li Auto News",
    brands: ["Li Auto"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.lixiang.com/news",
    pressUrl: "https://www.lixiang.com/news",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("gwm-press", {
    name: "GWM Global Press",
    brands: ["Great Wall", "Haval", "ORA", "Wey"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.gwm-global.com/news",
    pressUrl: "https://www.gwm-global.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("mg-motor-global", {
    name: "MG Motor Global",
    brands: ["MG"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.mgmotor.eu/en/news",
    pressUrl: "https://www.mgmotor.eu/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified",
    licenseNotes: "SAIC/MG — portal europejski."
  }),
  src("chery-press", {
    name: "Chery Press",
    brands: ["Chery", "Omoda", "Jaecoo"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.cheryinternational.com/news",
    pressUrl: "https://www.cheryinternational.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("leapmotor-news", {
    name: "Leapmotor News",
    brands: ["Leapmotor"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.leapmotor.com/news",
    pressUrl: "https://www.leapmotor.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("avatr-media", {
    name: "Avatr Media",
    brands: ["Avatr"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.avatr.com/en/news",
    pressUrl: "https://www.avatr.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("deepal-media", {
    name: "Deepal Press",
    brands: ["Deepal"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.deepal.com.cn/en/news",
    pressUrl: "https://www.deepal.com.cn/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("hongqi-media", {
    name: "Hongqi Global Media",
    brands: ["Hongqi"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.hongqi-auto.com/en/news",
    pressUrl: "https://www.hongqi-auto.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("voyah-media", {
    name: "Voyah Press",
    brands: ["Voyah"],
    region: "CN",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.voyah.com.cn/en/news",
    pressUrl: "https://www.voyah.com.cn/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),

  // ── Luxury / supercar ─────────────────────────────────────────────
  src("jlr-press", {
    name: "Jaguar Land Rover Press",
    brands: ["Jaguar", "Land Rover"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://media.jaguarlandrover.com/",
    pressUrl: "https://media.jaguarlandrover.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("ferrari-media", {
    name: "Ferrari Media",
    brands: ["Ferrari"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://media.ferrari.com/",
    pressUrl: "https://media.ferrari.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("mclaren-media", {
    name: "McLaren Media",
    brands: ["McLaren"],
    region: "EU",
    sourceType: "requires_login",
    fetchUrl: "https://media.mclaren.com/",
    pressUrl: "https://media.mclaren.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("aston-martin-media", {
    name: "Aston Martin Media",
    brands: ["Aston Martin"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://media.astonmartin.com/",
    pressUrl: "https://media.astonmartin.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "verified"
  }),
  src("koenigsegg-news", {
    name: "Koenigsegg News",
    brands: ["Koenigsegg"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.koenigsegg.com/media/",
    pressUrl: "https://www.koenigsegg.com/media/",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("pagani-media", {
    name: "Pagani Press",
    brands: ["Pagani"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.pagani.com/press/",
    pressUrl: "https://www.pagani.com/press/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("rimac-bugatti-media", {
    name: "Bugatti Rimac Media",
    brands: ["Rimac", "Bugatti Rimac"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.rimac-automobili.com/news/",
    pressUrl: "https://www.rimac-automobili.com/",
    loginRequired: false,
    enabled: false,
    verificationStatus: "needs_review"
  }),

  // ── Commercial (opcjonalne) ───────────────────────────────────────
  src("iveco-press", {
    name: "Iveco Group Press",
    brands: ["Iveco"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.ivecogroup.com/media/press_releases",
    pressUrl: "https://www.ivecogroup.com/media",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review",
    licenseNotes: "Pojazdy użytkowe — poza głównym pipeline aut osobowych."
  }),
  src("man-trucks-press", {
    name: "MAN Truck & Bus Press",
    brands: ["MAN"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.mantruckandbus.com/en/press.html",
    pressUrl: "https://www.mantruckandbus.com/en/press.html",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("scania-news", {
    name: "Scania Newsroom",
    brands: ["Scania"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.scania.com/group/en/home/newsroom.html",
    pressUrl: "https://www.scania.com/group/en/home/newsroom.html",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review"
  }),
  src("volvo-trucks-press", {
    name: "Volvo Trucks Press",
    brands: ["Volvo Trucks"],
    region: "EU",
    sourceType: "newsroom_html",
    fetchUrl: "https://www.volvotrucks.com/en-en/news.html",
    pressUrl: "https://www.volvotrucks.com/",
    loginRequired: true,
    enabled: false,
    verificationStatus: "needs_review",
    licenseNotes: "Volvo Trucks (ciężarówki) — odróżniać od Volvo Cars."
  })
];

async function main() {
  const outPath = path.join(process.cwd(), "content", "news-catalog", "sources.json");
  const ids = new Set<string>();
  for (const s of sources) {
    if (ids.has(s.id)) throw new Error(`Duplikat id: ${s.id}`);
    ids.add(s.id);
  }
  await fs.writeFile(outPath, `${JSON.stringify(sources, null, 2)}\n`, "utf8");
  const enabled = sources.filter((s) => s.enabled).length;
  const brands = new Set(sources.flatMap((s) => s.brands));
  console.log(`Zapisano ${sources.length} źródeł (${enabled} enabled) → ${outPath}`);
  console.log(`Pokrycie marek (unikalne): ${brands.size}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
