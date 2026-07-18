-- idrivecars.pl leadgen schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    segment TEXT,
    msrp_pln INTEGER,
    used_price_est_pln INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_models_brand_model ON models (brand, model);

CREATE TABLE IF NOT EXISTS financing_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_type TEXT NOT NULL CHECK (product_type IN ('lease', 'rent')),
    rate_annual REAL NOT NULL,
    default_down_pct REAL NOT NULL DEFAULT 0,
    default_term_months INTEGER NOT NULL DEFAULT 36,
    default_rv_pct REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    source_article_slug TEXT,
    source_type TEXT,
    funnel TEXT NOT NULL CHECK (funnel IN ('lease', 'insurance_a', 'insurance_b')),
    name TEXT,
    phone TEXT,
    nip TEXT,
    model TEXT,
    price_pln INTEGER,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'qualified', 'converted', 'deleted')),
    partner TEXT,
    consent_text TEXT,
    consent_at TEXT,
    ip_hash TEXT,
    calc_snapshot_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads (source_article_slug);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);

CREATE TABLE IF NOT EXISTS consent_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
    consent_text TEXT NOT NULL,
    consent_at TEXT NOT NULL,
    ip_hash TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_log_lead ON consent_log (lead_id);

CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER REFERENCES leads (id) ON DELETE SET NULL,
    partner TEXT NOT NULL,
    settlement TEXT NOT NULL CHECK (settlement IN ('cpl', 'success_fee')),
    amount_pln REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_commissions_lead ON commissions (lead_id);
CREATE INDEX IF NOT EXISTS idx_commissions_partner ON commissions (partner);

CREATE TABLE IF NOT EXISTS news_assets_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    source_id TEXT,
    license TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_news_assets_url ON news_assets_log (url);
