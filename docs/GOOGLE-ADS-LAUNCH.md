# Google Ads — przepis na start (idrivecars.pl)

> Przygotuj konto **jutro rano**. Strona musi być live z polityką prywatności, cookies i kontaktem **przed** uruchomieniem kampanii.

## 0. Co już jest w projekcie

| Element | Status |
|---------|--------|
| `/polityka-prywatnosci` | ✅ |
| `/cookies` + baner zgody | ✅ |
| `/kontakt` | ✅ |
| `AdSlot` (6 slotów) | ✅ placeholder / AdSense |
| `GoogleAnalytics` (GA4 + Ads tag) | ✅ po ustawieniu env |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | env — uzupełnij |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | env — uzupełnij |
| AdSense (`NEXT_PUBLIC_ADSENSE_*`) | osobna aplikacja — po wzroście ruchu |

**Uwaga:** Google **Ads** (kampanie płatne) ≠ Google **AdSense** (monetyzacja display). Na start potrzebujesz obu kont osobno, ale kampanie Ads możesz uruchomić bez AdSense.

---

## 1. Przed założeniem konta (D-day, rano)

- [ ] Strona live pod `https://idrivecars.pl`
- [ ] `NEXT_PUBLIC_SITE_URL=https://idrivecars.pl`
- [ ] Smoke: `./scripts/smoke-production.sh`
- [ ] Baner cookies działa — „Akceptuję” / „Tylko niezbędne”
- [ ] Google Search Console — dodaj właściwość (sekcja w `LAUNCH-PLAYBOOK.md`)

---

## 2. Założenie konta Google Ads

1. Wejdź na [ads.google.com](https://ads.google.com) → **Rozpocznij teraz**
2. Wybierz cel: **Ruch na stronie internetowej** (na start)
3. Kraj: **Polska**, waluta: **PLN**
4. Konto rozliczeniowe: karta / faktura (weryfikacja ~24h)
5. **Nie** uruchamiaj jeszcze Smart Campaign — wybierz **Tryb eksperta** (Expert Mode)

### Dane firmy / weryfikacja reklamodawcy

- Podaj dane właściciela (Marcin Bochenek / IDRIVECARS)
- Weryfikacja tożsamości Google (może zająć 1–3 dni) — **nie blokuj** tego uruchomienia konta, ale kampanie mogą być wstrzymane do weryfikacji

---

## 3. Google Analytics 4 (wymagane do Ads)

1. [analytics.google.com](https://analytics.google.com) → Utwórz konto **IDRIVECARS**
2. Właściwość: **idrivecars.pl** → strumień danych **Web**
3. Skopiuj **Measurement ID** (`G-XXXXXXXXXX`)
4. Na Mac Mini w `.env.production`:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

5. Redeploy → sprawdź w GA4 **Realtime** czy widać ruch (po akceptacji cookies)

### Połączenie Ads ↔ Analytics

- W Google Ads: **Narzędzia → Połączone konta → Google Analytics (GA4)** → Połącz
- Włącz **import konwersji** z GA4 (opcjonalnie na start)

---

## 4. Tag konwersji Google Ads

1. Google Ads → **Cele → Konwersje → Nowa akcja konwersji**
2. Typ: **Strona internetowa**
3. Zdarzenia do śledzenia (wybierz 1–2 na start):

| Zdarzenie | Kiedy | Priorytet |
|-----------|-------|-----------|
| `page_view` (domyślne) | Każda wizyta | niski |
| Scroll 90% artykułu | engagement | średni |
| Klik w RSS / social | mikro-konwersja | niski |

4. Skopiuj **Tag ID** (`AW-XXXXXXXXX`)
5. W `.env.production`:

```bash
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX
```

6. Komponent `GoogleAnalytics.tsx` ładuje gtag **po zgodzie cookies** — zgodne z RODO.

### Weryfikacja tagu

- Google Ads → **Narzędzia → Tag Google** → status „Aktywny”
- Rozszerzenie Chrome **Tag Assistant** — 1 odsłona po zgodzie

---

## 5. Struktura kampanii (blog motoryzacyjny)

### Faza 1 — Tydzień 1 (testy, mały budżet)

| Kampania | Typ | Budżet dzienny | Uwagi |
|----------|-----|----------------|-------|
| **Brand** | Search | 20–30 PLN | słowa: `idrivecars`, `marcin bochenek testy`, `idrivecars testy` |
| **Testy ogólne** | Search | 40–60 PLN | `test [model]`, `recenzja [model]`, long-tail PL |
| **News** | Search (opcjonalnie) | 20 PLN | tylko gdy masz świeże newsy Toyota RSS |

**Wyłącz na start:**
- Display Network (słaba jakość ruchu na blogu)
- Performance Max (za mało danych konwersji)
- Smart Campaign

### Faza 2 — Po 2 tygodniach (optymalizacja)

- Przejrzyj **Search Terms Report** — wyklucz „darmowe tapety”, „cena nowego”, „salon” jeśli nie pasują
- Dodaj **RSA** (Responsive Search Ads) z nagłówkami z prawdziwych tytułów testów
- Landing pages: **konkretny artykuł**, nie strona główna

### Przykładowe grupy reklam

**Brand:**
```
idrivecars
idrivecars.pl
marcin bochenek samochody
```

**Testy (przykład Mercedes):**
```
test mercedes amg gt
recenzja mercedes amg gt s
mercedes amg gt opinia
```

**News:**
```
toyota nowości 2026
toyota polska komunikat prasowy
```

---

## 6. AdSense (monetyzacja — osobno od Ads)

1. [adsense.google.com](https://adsense.google.com) → Zgłoś `https://idrivecars.pl`
2. Wymagania: treść oryginalna ✅, polityka prywatności ✅, ruch (minimalny, ale jakość ważniejsza)
3. Po akceptacji (~1–14 dni):

```bash
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
# opcjonalnie per-slot:
NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR_TOP=1234567890
```

4. Panel slotów: `/admin/ads`

**Konflikt Ads + AdSense:** możesz mieć oba — Ads kupuje ruch, AdSense monetyzuje organiczny. Nie kieruj płatnego ruchu na strony z samym AdSense bez wartościowej treści (polityka Google).

---

## 7. Checklist D+1 (dzień po uruchomieniu Ads)

- [ ] Tag aktywny w Google Ads
- [ ] GA4 Realtime pokazuje sesje
- [ ] Brak odrzuceń reklam (polityka — sprawdź e-mail Google)
- [ ] Kampania Brand ma CTR > 5% (normalne dla brandu)
- [ ] Search Terms — brak bezsensownych zapytań
- [ ] Budżet nie wypalony przed południem (ustaw limit dzienny)

---

## 8. Integracja z kodem (referencja)

| Plik | Rola |
|------|------|
| `src/components/GoogleAnalytics.tsx` | GA4 + Google Ads gtag |
| `src/components/CookieConsent.tsx` | zgoda RODO |
| `src/components/AdSlot.tsx` | sloty display |
| `src/components/AdSenseScript.tsx` | skrypt AdSense |
| `.env.production.example` | wszystkie zmienne |

Po zmianie env na Mac Mini:

```bash
./scripts/deploy-mac-mini.sh
```

---

## 9. Typowe błędy (unikaj)

1. **Kampania bez tagu** — brak pomiaru = zgadywanie
2. **Landing na `/`** zamiast artykułu — Quality Score niski, CPC wyższy
3. **Brak wykluczeń** — płacisz za „samochód używany otomoto”
4. **Ads włączone przed cookies** — ryzyko UODO; baner jest w layout
5. **Smart Campaign** — Google wybierze słowa losowe; na niszę motoryzacyjną słabe

Szerszy kontekst deployu: [`LAUNCH-PLAYBOOK.md`](LAUNCH-PLAYBOOK.md).
