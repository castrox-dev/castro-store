CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    discord_tag TEXT,
    cfx_key TEXT NOT NULL,
    cfx_key_hash TEXT NOT NULL,
    product TEXT NOT NULL CHECK (product IN ('police', 'faction')),
    product_id TEXT NOT NULL,
    license_key TEXT NOT NULL,
    resource_name TEXT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_license
    ON licenses (cfx_key_hash, product) WHERE revoked = 0;

CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses (license_key);
CREATE INDEX IF NOT EXISTS idx_licenses_cfx_product ON licenses (cfx_key_hash, product);
CREATE INDEX IF NOT EXISTS idx_licenses_discord ON licenses (discord_id);

CREATE TABLE IF NOT EXISTS rate_limits (
    discord_id TEXT NOT NULL,
    hour_bucket TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (discord_id, hour_bucket)
);
