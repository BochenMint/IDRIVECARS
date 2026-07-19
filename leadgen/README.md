# idrivecars.pl Leadgen Service

FastAPI backend for lead capture, insurance routing, and RODO compliance for [idrivecars.pl](https://idrivecars.pl).

## Features

- **POST `/webhook/lead`** – receive leads after calculator display; atomic write to `leads` + `consent_log`
- **DELETE `/rodo/erase`** – soft-delete PII (RODO right to erasure)
- **POST `/insurance/route`** – route to affiliate compare widget (path A) or OFWCA form (path B)
- **GET `/dashboard`** – HTML stats (Bearer token or `?token=`)
- **GET `/health`** – health check

## Setup

```bash
# 1. Create SQLite database
python /workspace/data/init_db.py

# 2. Install dependencies
cd /workspace/leadgen
pip install -r requirements.txt

# 3. Configure environment (optional)
cp .env.example .env   # if present; or export vars below

# 4. Run server
uvicorn leadgen.main:app --reload --host 0.0.0.0 --port 8000
```

Run from `/workspace` so the `leadgen` package resolves:

```bash
cd /workspace
uvicorn leadgen.main:app --reload --port 8000
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OFWCA_ACTIVE` | `false` | Enable path B (OFWCA form) for new-car / post-lease context |
| `PARTNER_MYLEAD_MODE` | `redirect` | `redirect` or `form` |
| `PARTNER_COMPERIA_MODE` | `form` | Partner routing mode |
| `PARTNER_LEADSTAR_MODE` | `redirect` | Partner routing mode |
| `CONSENT_CHECKBOX_TEXT` | (PL default) | Consent checkbox label |
| `SITE_ORIGIN` | `https://idrivecars.pl` | CORS origin |
| `DASHBOARD_TOKEN` | `changeme` | Dashboard auth token |
| `DATABASE_PATH` | `/workspace/data/idrive.db` | SQLite path |
| `BROKER_CRM_WEBHOOK_URL` | — | Optional CRM forward URL |
| `INSURANCE_AFFILIATE_BASE_URL` | — | Path A compare widget base URL |
| `TELEGRAM_BOT_TOKEN` | — | Path B notifications |
| `TELEGRAM_CHAT_ID` | — | Telegram chat for OFWCA alerts |
| `OFWCA_FORM_URL` | — | Path B form URL |

## API examples

### Submit lead

```bash
curl -X POST http://localhost:8000/webhook/lead \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jan Kowalski",
    "phone": "+48123456789",
    "model": "Toyota Corolla",
    "price_pln": 125000,
    "source_article_slug": "toyota-corolla-test",
    "consent": true,
    "calc_snapshot": {"product_type": "lease", "monthly_payment_pln": 1890}
  }'
```

### Insurance routing

```bash
curl -X POST http://localhost:8000/insurance/route \
  -H "Content-Type: application/json" \
  -d '{"new_car": true, "after_lease_calc": true, "model": "VW Golf"}'
```

### RODO erasure

```bash
curl -X DELETE "http://localhost:8000/rodo/erase?phone=%2B48123456789"
```

### Dashboard

Open `http://localhost:8000/dashboard?token=changeme` or send `Authorization: Bearer changeme`.

## Database

Schema and seed live in `/workspace/data/`:

- `schema.sql` – tables: `models`, `financing_rates`, `leads`, `consent_log`, `commissions`, `news_assets_log`
- `seed.sql` – sample models and financing rates
- `init_db.py` – creates `idrive.db`

Recreate with `--force`:

```bash
python /workspace/data/init_db.py --force
```

## Insurance routing rules

| Context | `OFWCA_ACTIVE=false` | `OFWCA_ACTIVE=true` |
|---------|----------------------|---------------------|
| New car / after lease calc | Path A (affiliate) | Path B (OFWCA + Telegram) |
| Used car / OC only / no financing | Path A | Path A |

Path A responses include `rel=sponsored` metadata and UOKiK disclosure text.

## License

Internal use for idrivecars.pl.
