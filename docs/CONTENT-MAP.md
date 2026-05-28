# Mapa treści — D:\MARCIN → IDRIVECARS

Inwentaryzacja materiałów źródłowych (maj 2026). **Oryginały na dysku nie są modyfikowane** — pipeline tylko kopiuje i konwertuje JPG/PNG do WEBP.

## Statystyki (aktualizacja)

| Metryka | Wartość |
|---------|--------:|
| Artykuły MDX | **121** |
| Artykuły z `galleryDir` | **38** |
| Galerie WEBP | **42** folderów |
| Zdjęcia WEBP | **2747** |
| `Galerie z testów` | ~6639 | główny bank zdjęć testowych (JPG + RAW) |
| `Z PULPITU\DYSK GOOGLE\MARCIN\aG\Testy` | ~66 docx | teksty testów autoGaleria |
| `Artykuły\TESTY` | 51 docx | starsze testy i pierwsze jazdy |
| `Foty do obróbki - Marcin` | ~1427 | RAW do obróbki |
| `I DRIVE CARS\Galerie` | 4 zestawy | gotowe galerie pod blog WP |

## Artykuły już w repo (content/testy)

| Slug artykułu | galleryDir | Folder źródłowy (D:\MARCIN) | Status galerii |
|---------------|------------|----------------------------|----------------|
| `audi-a7-30-tdi` | `audi-a7-30-tdi` | Galerie z testów\Audi A7 3.0 TDI | ✅ |
| `bentley-continental-gt-v8-s-convertible` | `bentley-continental-gt-v8-s-convertible` | Bentley Continental GT V8 S Convertible | ✅ |
| `ford-focus-rs-najlepszy-z-chuliganow` | `ford-focus-rs-pierwsza-jazda` | Ford Focus RS Pierwsza Jazda | ✅ convert:linked |
| `mazda-mx-5-nd-do-korzeni` | `mazda-mx-5-nd-do-korzeni` | Mazda MX-5 Barcelona | ✅ convert:linked |
| `mercedes-maybach-s-600` | `mercedes-maybach-s-600` | Mercedes-Maybach S600 | ✅ convert:linked |
| `volkswagen-passat-alltrack-all-inclusive` | `volkswagen-passat-alltrack-all-inclusive` | Volksawgen Passat Alltrack | ✅ convert:linked |
| `bmw-x6-m50d-fl` | `bmw-x6-m50d-fl` | X6 M50d (tylko CR2) | ⏳ wymaga eksportu JPG |
| `aston-martin-motorsport` | `aston-martin-motorsport` | brak dedykowanej galerii | 🔍 do ustalenia |
| `evoque-convertible-concept` | `evoque-convertible-concept` | brak | 🔍 |
| `opel-zafira-tourer` | `opel-zafira-tourer` | brak | 🔍 |
| `redbull` | `redbull` | brak | 🔍 |

## Kolejka importu (priorytet: testy + pierwsze jazdy)

| Tekst (docx) | Galeria | Typ |
|--------------|---------|-----|
| BMW 435i Cabriolet | BMW 435i Cabriolet | test |
| Land Rover Discovery Sport | Land Rover Discovery Pierwsza Jazda | pierwsza jazda |
| Lexus RC F | Lexus RC F - Pierwsza Jazda | pierwsza jazda |
| Lexus NX 300h F-Sport | Lexus NX 300h F-Sport | test |
| Volvo XC90 | Volvo XC90 - Gdańsk | test |
| Pierwsza Jazda Passat | Pierwsza Jazda - Volkswagen Passat | pierwsza jazda |
| Pierwsza Jazda - Skoda Fabia | Skoda Fabia - Pierwsza Jazda | pierwsza jazda |
| Pierwsza Jazda - Nissan Pulsar | Nissan Pulsar - Pierwsza Jazda | pierwsza jazda |
| Fiat 500 (Turyn) | Fiat 500 Pierwsza Jazda | pierwsza jazda |
| Alfa Giulia QV | ALFA ROMEO GIULIA NA ŻYWO | event |

Pełna lista w `scripts/gallery-links.json` → sekcja `pendingImport`.

## Foldery pomijane przy konwersji

- `SUROWE` — archiwum RAW (6442 plików CR2), nie kasować
- `LIGHTROOM KATALOG`, `Maybachy`, `Zegary i dane`

## Konwencje nazw zdjęć

- `{marka}-{model}-test-{rok}-{nr}.jpg`
- `{model}_pierwsza_jazda_{rok}-{nr}.jpg`
- `auto-test-{model}-{rok}-{nr}.jpg`

## Następne kroki

1. `npm run convert:linked && npm run generate:galleries-manifest`
2. Import kolejnych docx z `aG\Testy\Opublikowane`
3. Eksport JPG z RAW dla BMW X6 M50d
4. Ujednolicenie slugów artykuł vs folder galerii
5. Deploy (Vercel) + docelowa domena idrivecars.pl
