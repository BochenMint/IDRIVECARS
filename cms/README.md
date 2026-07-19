# Owner CMS — idrivecars.pl

Panel właściciela do publikacji testów i newsów bez ręcznej edycji frontmatter.

## Uruchomienie

```bash
pip install -r cms/requirements.txt
cp cms/.env.example cms/.env   # ustaw CMS_PASSWORD i CMS_SECRET
npm run cms                    # http://127.0.0.1:8001
```

Logowanie: hasło z `CMS_PASSWORD` (domyślnie `changeme` — **zmień przed użyciem**).

## Workflow

1. Otwórz `/cms/` → **Nowy test** lub **Nowy news**
2. Wklej tytuł i treść (Markdown lub zwykły tekst)
3. Opcjonalnie: zdjęcia (pierwsze = hero)
4. **Zapisz szkic** — zapisuje `.md` w `site/src/content/` bez deployu
5. **Publikuj** — zapis + `npm run build` (+ `scripts/deploy-site.sh` gdy `DEPLOY_PATH` ustawione) + IndexNow

SEO (slug, lead, canonical, hero) uzupełnia się automatycznie.

## Bezpieczeństwo

- Serwis domyślnie nasłuchuje na **127.0.0.1:8001** — nie wystawiaj publicznie bez VPN / Cloudflare Access
- Sesja: podpisany cookie HttpOnly (`CMS_SECRET`)
- CSRF: SameSite cookie + sprawdzanie `Origin` na POST

## Ścieżki

| Zmienna | Domyślnie |
|---------|-----------|
| Treść testów | `site/src/content/tests/` |
| Treść news | `site/src/content/news/` |
| Sync testów (legacy) | `content/testy/*.mdx` |
| Galerie | `public/galleries/<slug>/` |
| Manifest | `site/src/data/galleries-manifest.json` |
| Audit log | `data/cms_audit.log` |

## Testy

```bash
python3 -m pytest cms/tests -q
```

## API (wymaga sesji)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/health` | Health check |
| POST | `/cms/api/save` | Zapis szkicu (JSON) |
| POST | `/cms/api/publish` | Zapis + deploy |
| POST | `/cms/api/upload` | Upload zdjęć (multipart) |
| POST | `/cms/api/seo-preview` | Podgląd SEO |
| DELETE | `/cms/api/{type}/{slug}` | Usuń artykuł |
