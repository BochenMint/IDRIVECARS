# idrivecars.pl News Agent

Python 3.12 pipeline for ingesting official automotive news, enriching with Polish-market signals, drafting via a **local LLM only**, and routing through a Telegram approval gate before publish.

## Pipeline order (strict)

1. **Ingest** – RSS (`ingest/rss.py`) + HTML diff (`ingest/htmldiff.py`) from `ingest/registry.yaml`
2. **Dedup** – content hash + title similarity (`pipeline.py`)
3. **Enrich** – minimum 2 of 5 PL signals (`enrich/enrich.py`)
4. **Draft** – local LLM or structured stub (`draft/draft.py`)
5. **Gate** – score + Telegram review (`gate/score.py`, `gate/telegram.py`)
6. **Publish** – on manual approve (`publish/publish.py`) – never auto during first 90 days

Phase 2 (optional, separate flag): `enrich/refresh_tests.py` appends **„Ten model dziś”** to legacy tests.

**Wave migration (Phase 2):** publish **15–25 refreshed tests per week**, never bulk. Limits and policy live in `enrich/wave_config.yaml` (`max_per_week: 20`, `published_elsewhere_policy: canonical_or_update`). The weekly cap is enforced in code via `WAVE_WEEKLY_LIMIT` / DB counters — do not raise both at once for a one-shot dump.

## Quick start

```bash
cd /workspace/agent
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Copy and edit secrets (Mac-local)
cp .env.example .env
```

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCAL_LLM_URL` | `http://127.0.0.1:8080` | Local OpenAI-compatible LLM |
| `VOICE_LORA` | `idrive_voice_v1` | LoRA adapter name |
| `TELEGRAM_BOT_TOKEN` | – | Bot token (Mac Keychain / 1Password) |
| `TELEGRAM_CHAT_ID` | – | Editorial chat id |
| `AUTO_PUBLISH` | `false` | Hard default off |
| `DAILY_NEWS_LIMIT` | `10` | Max news processed/published per day |
| `WAVE_WEEKLY_LIMIT` | `20` | Max test refreshes per week |
| `IDRIVE_DB_PATH` | `../data/idrive.db` | SQLite state |
| `INDEXNOW_KEY` | – | IndexNow API key |
| `BUILD_HOOK_URL` | – | Deploy hook after git commit |

## Run

```bash
# Full pipeline (ingest → dedup → enrich → draft → gate)
python pipeline.py

# Dry run (no Telegram)
python pipeline.py --dry-run

# Phase 2: refresh up to wave_weekly_limit legacy tests
python pipeline.py --refresh-tests

# Publish approved draft manually
python pipeline.py --publish 20250718-toyota-corolla-refresh
```

Logs: `agent/data/logs/pipeline-YYYYMMDD.log`

Drafts: `agent/data/drafts/*.json`

Snapshots (HTML diff): `agent/data/snapshots/`

## macOS launchd (scheduled runs)

Create `~/Library/LaunchAgents/pl.idrivecars.news-agent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>pl.idrivecars.news-agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/YOU/idrivecars/agent/.venv/bin/python</string>
    <string>/Users/YOU/idrivecars/agent/pipeline.py</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/YOU/idrivecars/agent</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>7</integer>
    <key>Minute</key>
    <integer>30</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/Users/YOU/idrivecars/agent/data/logs/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/YOU/idrivecars/agent/data/logs/launchd.err.log</string>
</dict>
</plist>
```

Load:

```bash
launchctl load ~/Library/LaunchAgents/pl.idrivecars.news-agent.plist
launchctl start pl.idrivecars.news-agent
```

For test refresh (weekly), add a second plist calling `pipeline.py --refresh-tests` on Monday 08:00.

## Local LLM (Mac)

1. Run llama.cpp / MLX server on port 8080 with OpenAI-compatible `/v1/chat/completions`.
2. Load LoRA adapter `idrive_voice_v1` (or set `VOICE_LORA`).
3. If the endpoint is down, the agent still produces a **structured stub draft** from facts.

## Telegram workflow

1. Pipeline sends draft summary with scores.
2. Editor replies: `/approve <slug>`, `/reject <slug>`, or `/edit <slug>`.
3. On approve, run `python pipeline.py --publish <slug>` (or wire a small webhook bot listener).

`AUTO_PUBLISH=false` is enforced in code for the first 90 days.

## Registry

Edit `ingest/registry.yaml` to add/remove sources. Each entry needs `id`, `name`, `brand`, `type` (`rss` | `html`), `url`, `license`, optional `embargo_until`.

## Limits

| Limit | Default | Config |
|-------|---------|--------|
| Daily news | 10 | `daily_news_limit` |
| Weekly test refresh | 20 | `wave_weekly_limit` |
| Dedup similarity | 0.85 | `dedup_similarity_threshold` |

## Data layout

```
agent/
  data/
    idrive.db          # created on first run (or ../data/idrive.db)
    snapshots/         # HTML page hashes
    drafts/            # JSON drafts awaiting approval
    refreshed_tests/   # Phase 2 outputs
    logs/
```

## Development

```bash
python -m compileall .
python pipeline.py --dry-run --max-items 3 --verbose
```

No cloud LLM calls are made. Telegram and IndexNow use HTTPS only for notifications and SEO ping.
