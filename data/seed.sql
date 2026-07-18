-- Sample vehicle models
INSERT OR IGNORE INTO models (brand, model, segment, msrp_pln, used_price_est_pln) VALUES
    ('Toyota', 'Corolla', 'kompakt', 125000, 72000),
    ('Volkswagen', 'Golf', 'kompakt', 118000, 68000),
    ('Skoda', 'Octavia', 'kompakt', 112000, 65000),
    ('Kia', 'Sportage', 'SUV', 145000, 88000),
    ('Hyundai', 'Tucson', 'SUV', 142000, 85000);

-- Default financing rates
INSERT OR IGNORE INTO financing_rates (product_type, rate_annual, default_down_pct, default_term_months, default_rv_pct, notes) VALUES
    ('lease', 5.5, 10.0, 48, 35.0, 'Domyślna stawka leasingu operacyjnego'),
    ('rent', 8.9, 0.0, 36, 0.0, 'Wynajem długoterminowy – wyższa stawka, brak wykupu');
