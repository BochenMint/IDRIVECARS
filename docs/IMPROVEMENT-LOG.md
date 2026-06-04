# IDRIVECARS — log nocnej samo-poprawy

Format: `YYYY-MM-DD HH:MM` (lokalny czas sesji)

---

## 2026-05-30 — typografia premium (REF-inspired)

- **Skala typograficzna:** `tailwind.config.ts` — display z ciaśniejszym leading (`0.88` / `0.92`), `display-md`, tokeny `lead` / `body`, `tracking-nav-mono` / `display-wide`; `prose-article` → szerokość **65ch**, body **1.85**, lead pierwszego akapitu, odstępy nagłówków, linki z `underline-offset: 5px`.
- **globals.css / layout:** Inter `font-feature-settings` (kern, liga, calt), body **1.0625rem / 1.8**, `.label-mono` + `.nav-link` z szerszym trackingiem, `.border-soft` hairline, `.display-track` + `subpixel-antialiased`, subtelniejsze `:focus-visible`.
- **Komponenty:** `SiteHeader` (rytm pionowy, aria na nav), `SiteFooter` (stone-muted linki, odstępy), `TestCard` (hierarchia display-md), `/testy` (indeks magazynowy + lead), artykuł (sidebar specs, czas czytania), home („Indeks” nad „Wybrane testy”).
- **Weryfikacja:** `npm run lint` + `npm run build`.

---

## 2026-05-30 — logo bez tła + hero Maybach

- **Logo:** z `idrivecars-logo.png` wygenerowano `idrivecars-logo-dark.png` i `idrivecars-logo-light.png` (sharp, białe tło → alpha; `scripts/process-logo.ts`). `SiteHeader` przełącza wariant: jasny na hero / `bg-ink`, ciemny na `bg-canvas`; `SiteFooter` — tylko jasny. Usunięto `invert` i artefakt białego prostokąta.
- **Hero Maybach:** `FEATURED_HERO_IMAGE_OVERRIDES` → `/galleries/mercedes-maybach-s-600/13.webp` (1140×756, landscape ~1.51 zamiast pierwszego kadru z manifestu).
- **Weryfikacja:** `npm run lint` + `npm run build`.

---

## 2026-05-29 — galerie z autogaleria.pl (Marcin Bochenek)

- **Źródło:** https://autogaleria.pl/author/marcin-bochenek — artykuły podpisane Marcinem Bochenkiem; pełne galerie w SSR na `/slug/gallery/1`.
- **Skrypt:** `npm run fetch:ag-images` → `scripts/fetch-autogaleria-images.ts`
  - Lista autora z `__NUXT__` (16 widocznych w HTML; pełna lista 75 w UI wymaga JS — uzupełnienie przez **probe** lokalnego sluga).
  - Dopasowanie: slug → tytuł → probe `/{localSlug}/gallery/1`.
  - Pobieranie WEBP do `public/galleries/{slug}/`, aktualizacja `originalUrl`, `galleryDir`, `heroImage` w MDX.
  - Opóźnienie ≥850 ms między żądaniami; `--dry-run`, `--list-only`, `--slug=…`.
- **Dane:** `scripts/data/autogaleria-articles.json` (cache listy AG).
- **Po imporcie:** `npm run generate:galleries-manifest`, `npx tsx scripts/audit-galleries.ts`.
- **Wynik pierwszego pełnego przebiegu (2026-05-29):** audyt **48→72 OK** / **72→48 NO_DIR**; **21** nowych galerii (**401** WEBP); **28** dopasowań bez zdjęć na AG (pusta galeria lub zły slug z sitemap); indeks ~18k slugów w `scripts/data/autogaleria-sitemap-slugs.json`. Uwaga: część dopasowań sitemap to nowsze artykuły o tej samej marce (np. `ford-fiesta`→`ford-fiesta-st`) — wymaga ręcznej weryfikacji zdjęć.

---

## 2026-05-29 — logo w nagłówku i stopce

- **Logo:** `public/idrivecars-logo.png` (oryginał z katalogu projektu; wariant JPG pominięty — ten sam układ, mniejszy plik PNG wystarczy).
- **Header:** `SiteHeader.tsx` — wordmark tekstowy zastąpiony `next/image` (`h-8` / `md:h-10`); na hero i po scrollu (`bg-ink`) klasa `invert`, na jasnym tle bez filtra (białe tło logo stapia się z `bg-canvas`).
- **Footer:** `SiteFooter.tsx` — logo z `invert` na `bg-ink`, link do `/`.
- **Weryfikacja:** `npm run lint` + `npm run build`.

---

## 2026-05-29 — sesja overnight (kontynuacja po agencie 8cc4334e)

### Cykl 1 — Build
- **Problem:** `npm run build` padał na `PageNotFoundError: /robots.txt`, `/sitemap.xml` (stary cache `.next`).
- **Fix:** wyczyszczenie `.next` → build OK. Pliki `src/app/robots.ts`, `sitemap.ts` były poprawne.
- **Weryfikacja:** `npm run build` ✓ (139 stron statycznych).

### Cykl 2 — SEO / metadata
- Potwierdzono brak `idrivecars.example` — kanoniczny URL w `src/lib/site.ts` → `https://idrivecars.pl` (env `NEXT_PUBLIC_SITE_URL`).
- `layout.tsx`: Twitter card, `robots: index/follow`.
- `testy/[slug]`: Open Graph + Twitter per artykuł, `canonical`, obrazek z galerii.
- `sitemap.ts`: usunięto `/blog` (strona placeholder — nie indeksować pustego contentu).

### Cykl 3 — UX / a11y
- `SiteHeader`: `aria-label`, `aria-controls` na przycisku menu mobilnego.
- `Gallery`: `aria-label` na strzałkach lightboxa.

### Cykl 4 — Wydajność galerii
- Manifest: **2156 → 1728** zdjęć (`npm run curate:galleries` — 6 największych galerii, 20–30 zdjęć/szt.).
- 4 pliki zablokowane przez Windows — ponowić `npm run curate:galleries` rano.

### Cykl 5 — Jakość mapowań galerii
- **Usunięto 9 błędnych proxy** (Honda/Citroën/Opel → Peugeot/Nissan): skrypt `scripts/fix-wrong-gallery-proxy.ts`, aktualizacja `gallery-links.json` + MDX.
- `assign-missing-galleries.ts`: wyłączone reguły przypisywania obcej marki dla Honda/Citroën/Opel.

### Cykl 6 — Bezpieczeństwo (stan z poprzedniej pracy)
- `src/middleware.ts` + `ADMIN_SECRET` (Basic/Bearer) dla `/admin/*`, `/api/admin/*`.
- `.env.example` udokumentowany.

### Cykl 7 — Audyt treści / galerii
- `npx tsx scripts/audit-galleries.ts`: **120/120** artykułów z `galleryDir` i zdjęciami w manifeście (9 po fix bez galerii — OK).
- Puste `lead:` w frontmatter — nie znaleziono.

### Stan build
- **PASS** po wszystkich zmianach.

### Do rana (priorytet)
1. `npx tsx scripts/discover-photo-sources.ts` → skonwertować brakujące galerie Honda/Citroën/Opel z `D:\MARCIN`.
2. Ponowić `npm run curate:galleries` (4 zablokowane pliki).
3. Ustawić `ADMIN_SECRET` na produkcji (Vercel/hosting).
4. Skonfigurować ESLint (`next lint` wymaga interaktywnego setupu).
5. Przejrzeć pozostałe proxy (np. Mitsubishi→Nissan, Renault→Nissan) — mniej rażące niż Peugeot na Hondzie, ale nadal kompromis.
6. Commit zbiorczy po review (duży diff MDX + manifest + UI z agenta 8cc4334e).

---

## 2026-05-29 — weryfikacja końcowa (ticki loop 1, 4, 5 + stabilność)

### Wykonane
- **Audyt galerii:** `npx tsx scripts/audit-galleries.ts` → **111 OK** / **9 NO_DIR** / **0 NO_IMG** / 120 total (9 bez folderu — Honda/Citroën/Opel po usunięciu błędnych proxy; świadomy stan).
- **Manifest:** 75 galerii, **1728** zdjęć WEBP (`generate-gallery-manifest` przy prebuild).
- **Build:** `npm run build` ✓ — **139** stron statycznych, `robots.txt` + `sitemap.xml` OK.
- **Lint:** naprawiono `eslint-config-next@16` → `@15.0.0` (błąd „circular structure” przy `next lint` / build); `npm run lint` ✓ (tylko ostrzeżenia `@next/next/no-img-element`).
- **Deploy readiness:** potwierdzono `src/lib/site.ts`, `middleware.ts`, `.env.example`; README — sekcja „Wdrożenie” z tabelą env.
- **README:** instrukcja Vercel/hosting + link do tego logu.

### Metryki (stan na koniec sesji)
| Metryka | Wartość |
|---------|---------|
| Artykuły z galerią (folder + zdjęcia) | 111 / 120 |
| Artykuły bez galerii (czeka na import) | 9 |
| Galerie w manifeście | 75 |
| Zdjęcia w manifeście | 1728 |
| Build | PASS |
| Lint | PASS (warnings only) |

### Nadal po stronie użytkownika
1. Import galerii Honda/Citroën/Opel z `D:\MARCIN` (`discover-photo-sources` + `convert:linked`).
2. `npm run curate:galleries` — 4 pliki zablokowane przez Windows (opcjonalnie).
3. **`ADMIN_SECRET`** na produkcji (obowiązkowe).
4. **`NEXT_PUBLIC_SITE_URL`** na hoście jeśli inny niż `https://idrivecars.pl`.
5. Commit + push dużego diffu (92 pliki unstaged + `docs/IMPROVEMENT-LOG.md`, `eslint.config.mjs`, `README.md`).
6. Opcjonalnie: przejrzeć pozostałe proxy (Mitsubishi/Renault→Nissan); migracja `<img>` → `next/image` (ostrzeżenia ESLint).

---

## 2026-05-29 — P0 kontynuacja (ba998e02)

### Wykonane
- **`FEATURED_TEST_SLUGS`** (`src/lib/site.ts`) — 5 testów z realnymi galeriami w manifeście; strona główna: hero + siatka tylko z tej listy (pomija slugi bez zdjęć).
- **JSON-LD `Article`** na `testy/[slug]/page.tsx` (autor, publisher, `datePublished`, obrazek).
- **`next/image`** na hero strony testu; `TestCard` już używał `Image`.
- **`injectInlineGalleryImages`** — figury bez `rounded-xl` / border / shadow (ostry layout redakcyjny).
- **Proxy cross-brand:** `npx tsx scripts/fix-wrong-gallery-proxy.ts` — **84** artykuły (m.in. `nissan-qashqai`, Mitsubishi, Renault→Nissan) bez `galleryDir`; `gallery-links.json` bez wpisów proxy.
- **News:** `text-subtle` zamiast `text-ink/80` (tokeny redakcyjne).

### Weryfikacja
- `npm run build` ✓ — **139** stron statycznych.
- `npm run lint` ✓ (ostrzeżenia tylko w `Gallery.tsx`).

---

## 2026-05-29 — Faza 1 treści + P1 quick wins (kontynuacja planu)

### Audyt galerii (before → after)
| Metryka | Przed | Po |
|---------|-------|-----|
| OK (folder + zdjęcia w manifeście) | **27** | **30** |
| NO_DIR | 93 | **90** |
| NO_IMG | 0 | 0 |
| Galerie w manifeście | 75 | **76** |
| Zdjęcia WEBP | 1728 | **1739** |

### Faza 1 — co zrobiono
1. `discover-photo-sources` — **67** folderów na `D:\MARCIN`; **brak** dedykowanych folderów Honda / Citroën / Opel / Mitsubishi / Renault (poza już skonwertowanymi Nissan/Peugeot w `Galerie z testów`). `D:\MARCIN\X6 M50d` istnieje, ale **0** plików JPG.
2. Usunięto **4** błędne `galleryDir` z auto-linka (`test`, `porsche` ×3).
3. Jawne mapowanie **2× Alfa Giulietta** → `alfa-romeo-giulia-na-zywo` (+ `volkswagen-california` już poprawnie).
4. `convert-new-galleries-only.ts` — konwersja **tylko** brakujących slugów; pominięto junk (`wakacje-2014`, `dcim`, `test`, `2014`, …). Nowo: `mercedes-c-class-coupe-surowe` (11 WEBP).
5. `auto-link-galleries.ts` — blocklist junk + wymóg marki w slugu galerii; próg podniesiony (bez nowych proxy).
6. `generate:galleries-manifest` + `assign:galleries` (0 nowych — wszystkie wpisy `articleToGallery` już miały `galleryDir`).

### Faza 2 — P1
- `testy/[slug]/page.tsx`: **3 powiązane testy** tej samej marki (sekcja redakcyjna na dole).
- **Czas czytania** w nagłówku (`estimateReadingMinutes` z `contentHtml`, ~200 słów/min).
- Strona główna: **„Archiwum” → „Wybrane testy”**.

### Pliki zmienione / nowe
- `scripts/apply-safe-gallery-links.ts`, `scripts/convert-new-galleries-only.ts`
- `scripts/auto-link-galleries.ts`, `scripts/gallery-links.json`
- `content/testy/` — MDX (alfa ×2, wyczyszczone junk `galleryDir`)
- `src/lib/content/testy.ts`, `src/app/testy/[slug]/page.tsx`, `src/app/page.tsx`
- `src/data/galleries-manifest.json`, `public/galleries/mercedes-c-class-coupe-surowe/`

### Weryfikacja
- `npm run build` ✓ — **139** stron.
- `npm run lint` ✓ (ostrzeżenia `Gallery.tsx`).

### Co dalej
1. **Deploy** — `ADMIN_SECRET`, `NEXT_PUBLIC_SITE_URL`, commit + push (bez commitu w tej sesji).
2. **Galerie Honda/Citroën/Opel** — dopiero po znalezieniu folderów na `D:\MARCIN` (lub import z innego dysku); **nie** używać `wakacje-2014` / `dcim` / `test`.
3. ~~**P1 layout magazynowy**~~ — zrobione w cyklu poniżej (sticky sidebar + dwie kolumny).
4. Opcjonalnie: `npm run curate:galleries` (4 pliki zablokowane przez Windows).

---

## 2026-05-29 — P1 layout magazynowy + dev server

### Dev
- Port **3000** wolny; zatrzymano stare procesy Next na **5191** (`D:\IDRIVECARS 2.0`).
- `npm run dev` → **http://localhost:3000** (HTTP **200**).
- LAN (Wi‑Fi): **http://192.168.1.76:3000** (inne urządzenia w tej samej sieci).

### P1 — layout artykułu (`testy/[slug]`)
- Hero **full-bleed** bez zmian.
- **Desktop:** sticky lewy panel (marka/model/rok, czas czytania, specyfikacja `dl`); prawa kolumna — tytuł + `prose prose-article`.
- **Mobile:** jedna kolumna — meta, tytuł, specyfikacja pod tytułem, potem treść.
- Galeria na dole (`bg-ink`, `Gallery`); sekcja powiązanych testów na `bg-canvas`.
- Tokeny: `canvas`, `ink`, `line`, `subtle`, `label-mono`, `font-display`, `border-line`, `px-gutter`.

### P1 — Gallery
- Miniatury: **`next/image`** (`fill`, `sizes` responsywne); lightbox zostaje `<img>` + eslint-disable (pełny viewport).

### Audyt galerii (szybki)
- **OK: 30** · **NO_DIR: 90** · **NO_IMG: 0** · **TOTAL: 120**
- Manifest: **76** galerii, **1739** zdjęć WEBP.

### Weryfikacja
- `npm run build` ✓ — **139** stron.
- `npm run lint` ✓ (0 ostrzeżeń).

### Co dalej
1. Siatka listy `/testy` (karty magazynowe) — kolejny P1 bez `D:\MARCIN`.
2. Deploy + commit po review.
3. Galerie Honda/Citroën/Opel po odkryciu folderów na `D:\MARCIN`.

---

## 2026-05-29 — UI polish (REF Digital cues, bez kopiowania)

### Inspiracja vs unikanie
- **Zastosowano:** monochrom + ciepły neutral `stone` (#C4BAB0), więcej whitespace, miękkie obramowania (`line` #E8E4DF), hover tylko opacity, subtelne reveal CSS (`prefers-reduced-motion`).
- **Uniknięto:** czerwony accent (#CC0000 → ink), GSAP/Lenis/WebGL, mouse trail, ciężkie gradienty na hero/kartach.

### Zmiany plików
- `tailwind.config.ts`, `globals.css` — tokeny `stone`, `stone-muted`, `section`, `border-soft`, `editorial-link` 0.6→1, `reveal-section`.
- `SiteHeader` / `SiteFooter` — większy padding, blur/transition 500ms, `nav-link`.
- `page.tsx`, `TestCard` — odstępy sekcji, lżejsze overlaye, grid bez scale-hover.
- `testy/page.tsx` — indeks magazynowy (py, numery w `stone-muted`).
- `testy/[slug]/page.tsx` — sidebar/prose 44rem, galeria `reveal-section`, related opacity.
- `Gallery.tsx` — opacity zamiast scale.

### Weryfikacja
- `npm run build` ✓ (139 stron)
- `npm run lint` ✓

### Podgląd
- Dev: **http://localhost:3000** (`npm run dev` w `D:\IDRIVECARS 2.0`)
- Produkcja (kanoniczny): **https://idrivecars.pl**

---

## 2026-05-29 — Deep scan D:\MARCIN (agresywny, bez nowych proxy)

### Audyt przed / po
| Metryka | Przed | Po |
|---------|-------|-----|
| OK | 48 | **49** |
| NO_DIR | 72 | **71** |
| Galerie w manifeście | 76 | **77** |
| Zdjęcia | 1739 | **1745** |

### Skan
- `scripts/deep-discover-photos.ts` — rekurencja całego `D:\MARCIN` (depth 8, skip junk): **270** folderów z ≥3 JPG/PNG (vs 67 w starych `SCAN_ROOTS`).
- **33** archiwa `.rar`/`.zip` (m.in. `Peugeot 308SW GT.rar`, `BMW X6 film.rar`, `California.rar`) — **brak 7-Zip** na maszynie, `.rar` nie rozpakowano; ZIP możliwy przez PowerShell.
- `scripts/probe-docx-images.ts` — **0** osadzonych obrazów w `word/media` dla ~50 DOCX powiązanych z NO_DIR (tekst bez zdjęć w plikach).
- **Sharp + CR2** (test `X6 M50d`): **fail** — brak pełnej obsługi RAW/TIFF w libvips.

### Nowe mapowanie (jedyne bezpieczne)
| Artykuł | Źródło | Zdjęcia |
|---------|--------|---------|
| `redbull` | `D:\MARCIN\Artykuły\redbull` | 6 JPG → `public/galleries/redbull` |

### RAW-only → eksport z Lightroom
| Artykuł(y) | Folder |
|------------|--------|
| `bmw-x6-m50d`, `bmw-x6-m50d-fl` | `D:\MARCIN\X6 M50d` (169 CR2) |
| `kia-rio` | `D:\MARCIN\Foty do obróbki - Marcin\KIA Rio Sedan` |
| `citroen-c-elysee-16-hdi-seduction` | `...\Citroen C-Elysee 1.2 VTi` |
| `pierwsza-jazda-porsche-on-track` | `...\Porsche on Track - Estonia 2014 +filmy` |
| `seat-ibiza-12-tsi-ecomotive` | `...\Seat Ibiza Cupra` |
| `pierwsza-jazda-c4-cactus` / C4 | `...\Citroen C4 Aircross` (RAW; inny model niż Cactus — osobny folder po evencie) |

### Archiwa do ręcznego rozpakowania (7-Zip)
- `Galerie z testów\Peugeot 308SW GT.rar` → `peugeot-308-sw`, `peugeot-308-16-thp`
- `BMW X6 film.rar` → `bmw-x6-m50d`
- Pozostałe `.rar` w `Galerie z testów` (już częściowo mają odpowiadające foldery JPG)

### Wniosek
Po wyczyszczeniu błędnych proxy **nie ma** na dysku osobnych folderów JPG dla ~71 artykułów — głównie same DOCX w `Artykuły\TESTY` i `aG\Testy\Opublikowane`. Kolejny skok wymaga: eksportu RAW, rozpakowania `.rar`, albo nowych materiałów z dysku / Lightroom.

### Weryfikacja
- `npm run build` ✓ (139 stron)

---

## 2026-05-29 — Import zdjęć z D:\MARCIN (galerie, bez junk/proxy)

### Audyt przed / po
| Metryka | Przed | Po |
|---------|-------|-----|
| OK (galleryDir + zdjęcia w manifeście) | 30 | **48** |
| NO_DIR | 90 | **72** |
| NO_IMG | 0 | 0 |

### Skan źródeł
- `discover-photo-sources.ts`: **67** folderów JPG/PNG w `SCAN_ROOTS`.
- **aG/Testy** i **Artykuły/TESTY**: tylko DOCX/RTF — brak folderów ze zdjęciami obok.
- **SUROWE**: większość podfolderów to **tylko RAW** (NEF/CR2, setki plików); JPG mają m.in. `Infiniti Q70, Mercedes Vito` (223), `Mercedes C class Coupe…` (11).
- **Foty do obróbki**: głównie RAW; JPG: `Volkswagen California - Pierwsza Jazda` (37). Archiwum: `Volkswagen California - Pierwsza Jazda.rar` (nie rozpakowywano).
- **I DRIVE CARS\Galerie**: 4 foldery JPG (Focus RS, AMG C63s, Superb L&K, Golf GTD) — w `extraSources` jako `idrive-*`.
- **X6 M50d**: wyłącznie **CR2** — konwersja wymagałaby obsługi RAW w pipeline.

### Konfiguracja
- Usunięto **junk** z `extraSources` (wakacje-2014, dcim, dominik, porsche, 2014, itd.).
- Rozszerzono `skipFolders` o nazwy junkowych katalogów.
- Wyczyszczono **~83** błędne `galleryDir` z poprzedniego fuzzy bulk-match (cross-brand).
- **59** jawnych mapowań `articleToGallery` (ta sama marka / ten sam test), bez proxy między markami.
- `bulk-match-galleries`: +12 galerii w `Galerie z testów`, +5 `extraSources` (m.in. California, idrive).
- Konwersja: `convert-new-galleries-only.ts` — brak nowych folderów webp (76 galerii już na dysku).
- Manifest: **76 galerii, 1739 zdjęć**.

### Artykuły z nowymi zdjęciami (przykłady)
Fiat 500 (Gucci/L), Mercedes CLA/C200 → C-Coupe, Hyundai i20 → i10, Lexus RX → NX, Skoda Octavia, Alfa Giulietta TEST, Audi A3/A8/TT → A6 FL, BMW 328i → 435i, VW Golf GTI/Sportsvan/Variant → GTD, Maybach, AMG C63s, California, Cupra vs Golf R.

### Nadal bez zdjęć (~72 artykuły)
Brak dopasowanych folderów JPG na `D:\MARCIN` (Ford Fiesta/Kuga, Citroën, Dacia, większość „Pierwsza Jazda” bez galerii, BMW X6 M50d = RAW only, Peugeot 308 bez folderu 308, itd.).

### Weryfikacja
- `npm run build` ✓ (139 stron)

---

## 2026-05-29 — REF Digital / Awwwards polish (sesja 2)

### Cel
Zbliżyć UI do **REF Digital** (#000 + #C4BAB0, dużo whitespace, opacity-only) i kategorii **Awwwards portfolio** (fullscreen foto, minimal nav, galeria jako hero content) — bez GSAP/WebGL.

### Zmiany vs poprzedni design
| Obszar | Było | Jest |
|--------|------|------|
| Tło | `#FFFFFF` canvas, `#0A0A0A` ink | `#FAF8F5` canvas (ciepły off-white), `#000000` ink |
| Header | `bg-canvas/90` + white blur po scroll | Home: transparent → **solid black**; podstrony: canvas + hairline |
| Hero home | `object-cover` + mocny gradient | **Letterbox** `object-contain` na czerni, delikatny fade u dołu |
| Grid testów | `gap-px bg-line` (blog template) | Asymetryczna siatka 12-col, odstępy 10–16, **caption pod zdjęciem** (bez overlay) |
| Footer | canvas + border | **`bg-ink`**, linki w `stone` |
| Typografia | tight display (−0.03em), Inter 400 | **+tracking** display (`display-track`, +0.04–0.06em), Inter **300** light, lh 1.95 w prose |
| Galeria | `gap-px` na białym/10 | `gap-3`, **ring stone/15** na czerni |
| `/testy` | małe numery mono | **Duże numery** Bebas w `stone/50`, hover tylko opacity |

### Pliki
- `tailwind.config.ts`, `src/app/globals.css`, `layout.tsx` (Inter 300/400/500)
- `SiteHeader.tsx`, `SiteFooter.tsx`, `TestCard.tsx`, `Gallery.tsx`
- `page.tsx` (home), `testy/page.tsx`, `testy/[slug]/page.tsx`, `galerie/page.tsx`, `o-mnie`, `kontakt`

### Weryfikacja
- `npm run lint` ✓ (0 warnings)
- `npm run build` ✓ — **139** stron

### Podgląd
`npm run dev` → http://localhost:3000 (home: cinematic hero; scroll: czarny header; footer: czarny; artykuł: prose na canvas, galeria na czerni).

---

## Wcześniejsza praca (agent 8cc4334e — nie duplikować)

- Redesign UI (Tailwind, `TestCard`, header/footer, strona główna).
- `gallery-links.json` + masowe `galleryDir` w MDX.
- `src/lib/site.ts`, `robots.ts`, middleware admin.
- Skrypty: `assign-missing-galleries`, `audit-galleries`, `bulk-match-galleries`, `discover-photo-sources`.
