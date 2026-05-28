# Plan: reklamy, reklamodawcy i moduł NEWS

## 1. Miejsce na reklamy w serwisie

### 1.1 Sloty reklamowe (bezpieczne dla UX i wydajności)

| Slot | Lokalizacja | Format | Uwagi |
|------|-------------|--------|--------|
| **header-billboard** | Pod nawigacją (sticky lub na górze contentu) | 728×90 / responsive (np. 320×50 mobile) | Leaderboard; wysokie viewability. |
| **sidebar-top** | Prawa kolumna na stronie głównej i listach (testy, news) | 300×250 (Medium Rectangle) | Klasyczny MR; dobre CPM w motoryzacji. |
| **sidebar-sticky** | Prawa kolumna – drugi blok (sticky) | 300×250 lub 300×600 | Długie artykuły – reklama w zasięgu scrolla. |
| **in-article** | W tekście artykułu (np. po 2–3 akapitach) | 300×250 lub native in-feed | Maks. 1–2 na artykuł; nie przed pierwszym nagłówkiem. |
| **footer** | Nad stopką (cała szerokość) | 728×90 / 970×90 / responsive | Niski poziom irytacji. |
| **between-cards** | Między kartami testów na /testy i stronie głównej | 1×1 native lub 300×250 | Co 6–9 kart; wyraźne oznaczenie „Reklama”. |

### 1.2 Zasady wdrożenia

- **Lazy loading** – reklamy ładowane po wejściu w viewport (Intersection Observer).
- **Oznaczenie** – każdy blok z małą etykietą „Reklama” (zgodnie z rekomendacjami IAB i UOKiK).
- **Fallback** – gdy brak kampanii: puste miejsce lub własna promocja (newsletter, social).
- **Config** – w panelu admin: włącz/wyłącz sloty, wybór sieci (AdSense / program partnerski).

---

## 2. Reklamodawcy – rekomendacje na podstawie rynku

### 2.1 Źródła i wnioski

- **Polska:** branża motoryzacyjna (Trade) jest bardzo aktywna w reklamie online (m.in. dane gemiusAdReal 2024); rozliczenia CPM i programy CPL/CPA/CPS.
- **Nisza motoryzacyjna:** wyższe CPM niż w wielu innych niszach (np. w DE automotive ok. 1–3 USD CPM); w PL stawki niższe, ale motoryzacja nadal atrakcyjna.
- **Programy partnerskie:** Autobaza.pl (do ~20% prowizji), sieci typu webePartners – wiele programów bez limitu; OTOMOTO API do ogłoszeń (monetyzacja przez leady/sprzedaż).
- **Sieci display:** Mediavine / Raptive wymagają ruchu (np. 25k+ PV/mies.); na start realna jest **Google AdSense** (brak minimalnego ruchu, automatch reklam motoryzacyjnych).

### 2.2 Rekomendowana kolejność (maksymalizacja zysków)

1. **Google AdSense (start)**  
   - Wejście od razu, bez progu ruchu.  
   - Automatyczne dopasowanie reklam (dealerzy, ubezpieczenia, części, porównywarki).  
   - Docelowo: Auto ads + ręczne sloty (leaderboard, MR, in-article).  
   - **Cel:** stabilny CPM; po wzroście ruchu – negocjacje z sieciami premium.

2. **Programy afiliacyjne (motoryzacja)**  
   - **Autobaza.pl** – prowizja od raportów/sprzedaży; linki w testach („Sprawdź VIN”, „Wycenę”).  
   - **OTOMOTO / porównywarki** – CPA/CPL za leady (np. „Zapytaj o ofertę”, „Porównaj ceny”).  
   - **Ubezpieczenia (Link4, mfind itp.)** – CPL wysokie w PL; bannery w sidebarze lub pod artykułem.  
   - **Części i akcesoria** – programy z sieci (np. webePartners); kontekst: porady, testy, news.

3. **Sieci premium (po wzroście ruchu)**  
   - **Mediavine / Raptive** – przy 25k+ PV/mies. i dobrej jakości treści; wyższy RPM niż AdSense.  
   - **Direct deals** – dealerzy regionalni, importerzy; stałe stawki CPM lub płatność za artykuł/sponsoring.

### 2.3 Rekomendacja końcowa

- **Na start:** **Google AdSense** w zaplanowanych slotach (header, sidebar, in-article, footer, between-cards) + **jeden program afiliacyjny** (np. Autobaza.pl) w treści i w sidebarze.  
- **Po ok. 10–20k PV/mies.:** dodać drugi program CPL (ubezpieczenia/OTOMOTO) i testować A/B slotów.  
- **Po 25k+ PV:** aplikować do Mediavine/Raptive i ewentualnie zastępować część slotów AdSense reklamami premium.

---

## 3. Panel administracyjny – moduł automatycznej publikacji NEWS

### 3.1 Kategoria „NEWS”

- Nowa sekcja serwisu: **/news** (lista) oraz **/news/[slug]** (pojedynczy news).
- Treści: krótkie wpisy (nagłówek, lead, link do źródła, opcjonalnie miniatura); bez pełnych artykułów – raczej agregator z przekierowaniem.
- Źródła: kanały RSS (AutoCentrum.pl, Motorsport.com, inne) oraz opcjonalnie API (gdy dostępne).

### 3.2 Moduł auto-publikacji w panelu admin

**Lokalizacja:** `/admin` (chronione hasłem lub SSO; w przyszłości NextAuth/Clerk).

**Funkcjonalności:**

1. **Konfiguracja źródeł (RSS/API)**  
   - Lista źródeł: nazwa, URL kanału RSS, włącz/wyłącz, priorytet.  
   - Filtry: słowa kluczowe (dołącz / wyklucz), max liczba wpisów na jedno pobranie.  
   - Zapisywanie w DB lub pliku konfiguracyjnym (np. `content/news-sources.json`).

2. **Harmonogram pobrań**  
   - Cron / scheduled job (np. co 1–2 h): pobranie RSS, parsowanie, deduplikacja (po URL lub tytule), zapis do bazy/newsów.  
   - W panelu: ostatni run, log błędów, ręczne „Pobierz teraz”.

3. **Kolejka newsów**  
   - Lista pobranych pozycji: tytuł, źródło, data, link, status (szkic / opublikowany / pominięty).  
   - Akcje: Opublikuj, Odrzuć, Edytuj (tytuł, lead, miniatura).  
   - Opcjonalnie: auto-publikacja (wszystkie nowe od razu jako „opublikowane”) z możliwością wyłączenia.

4. **Ustawienia kategorii NEWS**  
   - Włącz/wyłącz sekcję na stronie.  
   - Maks. liczba newsów na stronie listy; czy pokazywać na stronie głównej (blok „Najnowsze newsy”).

### 3.3 Źródła RSS (do konfiguracji)

- **AutoCentrum.pl** – np. kanał „Newsy” (premiery, rynek, przepisy).  
- **Motorsport.com (PL)** – F1, WRC, rajdy.  
- Inne: wybrane portale motoryzacyjne z RSS (po weryfikacji regulaminu).

### 3.4 Techniczne

- **Backend:** API routes w Next.js (np. `/api/admin/news/fetch`, `/api/admin/news/sources`) lub osobny skrypt cron (Node/tsx) zapisujący do plików MDX/JSON w `content/news/`.  
- **Przechowywanie:** na start pliki w `content/news/*.mdx` (frontmatter: tytuł, lead, sourceUrl, sourceName, publishedAt, image) + indeks w JSON; docelowo baza (SQLite/Postgres) przy rozbudowie panelu.  
- **Bezpieczeństwo:** trasy `/admin/*` chronione (middleware: sprawdzenie sesji lub klucza API); nie wystawiać cron-a publicznie bez autoryzacji.

---

## 4. Kolejność wdrożenia

1. **Reklamy:** komponenty `AdSlot` + konfiguracja slotów (pliki/env) → wstawienie w layout i na kluczowych stronach → integracja AdSense (lub placeholder).  
2. **NEWS:** model danych i routing `/news`, `/news/[slug]` → panel admin (lista źródeł + kolejka) → skrypt/cron pobierający RSS → zapis do `content/news` i wyświetlenie na stronie.  
3. **Panel admin:** najpierw moduł NEWS (źródła + fetch + kolejka); potem sekcja „Reklamy” (włącz/wyłącz sloty, ID jednostek reklamowych).

Dokument można uzupełniać o konkretne ID slotów AdSense i przykłady konfiguracji RSS po wdrożeniu.

---

## 5. Wdrożone elementy (szkielet)

- **Sloty reklamowe:** komponent `AdSlot` (src/components/AdSlot.tsx) – używany w layout (header-billboard), stopce (footer), na /news (sidebar), w artykule news (in-article). Konfiguracja slotów w panelu /admin/ads.
- **Kategoria News:** strona /news (lista) i /news/[slug] (pojedynczy wpis). Treść w content/news/*.mdx (frontmatter: title, lead, sourceUrl, sourceName, publishedAt, status).
- **Panel admin:** /admin (start), /admin/news (kolejka + przycisk „Pobierz teraz”), /admin/news/sources (lista źródeł RSS), /admin/ads (lista slotów). Docelowo ochrona tras /admin/* (middleware / NextAuth).
- **Pobieranie RSS:** skrypt `scripts/fetch-news-rss.ts` (npm run fetch:news). Wymaga zainstalowania `rss-parser`. Źródła w `content/news-sources.json`.
