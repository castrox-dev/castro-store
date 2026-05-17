import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function hashCfx(cfxKey) {
  return crypto.createHash('sha256').update(normalizeCfxStored(cfxKey)).digest('hex');
}

function normalizeCfxStored(cfx) {
  return String(cfx || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function openDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

export function createLicenseRepo(db) {
  const insertStmt = db.prepare(`
    INSERT INTO licenses (discord_id, discord_tag, cfx_key, cfx_key_hash, product, product_id, license_key, resource_name, revoked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);

  const revokeActiveStmt = db.prepare(`
    UPDATE licenses
    SET revoked = 1, revoked_at = datetime('now')
    WHERE cfx_key_hash = ? AND product = ? AND revoked = 0
  `);

  const findByKeyStmt = db.prepare(`
    SELECT * FROM licenses WHERE license_key = ? AND revoked = 0 ORDER BY id DESC LIMIT 1
  `);

  const findActiveByCfxProductStmt = db.prepare(`
    SELECT * FROM licenses
    WHERE cfx_key_hash = ? AND product = ? AND revoked = 0
    ORDER BY id DESC LIMIT 1
  `);

  const findByDiscordStmt = db.prepare(`
    SELECT * FROM licenses WHERE discord_id = ? ORDER BY created_at DESC LIMIT 20
  `);

  const revokeByIdStmt = db.prepare(`
    UPDATE licenses SET revoked = 1, revoked_at = datetime('now') WHERE id = ? AND revoked = 0
  `);

  const revokeAllByDiscordStmt = db.prepare(`
    UPDATE licenses SET revoked = 1, revoked_at = datetime('now')
    WHERE discord_id = ? AND revoked = 0
  `);

  const rateGetStmt = db.prepare(`
    SELECT count FROM rate_limits WHERE discord_id = ? AND hour_bucket = ?
  `);

  const rateUpsertStmt = db.prepare(`
    INSERT INTO rate_limits (discord_id, hour_bucket, count) VALUES (?, ?, 1)
    ON CONFLICT(discord_id, hour_bucket) DO UPDATE SET count = count + 1
  `);

  const listActiveStmt = db.prepare(`
    SELECT * FROM licenses
    WHERE revoked = 0
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const listActiveByDiscordStmt = db.prepare(`
    SELECT * FROM licenses
    WHERE revoked = 0 AND discord_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const listActiveByProductStmt = db.prepare(`
    SELECT * FROM licenses
    WHERE revoked = 0 AND product = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const listActiveByProductDiscordStmt = db.prepare(`
    SELECT * FROM licenses
    WHERE revoked = 0 AND product = ? AND discord_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const findActiveByKeyLikeStmt = db.prepare(`
    SELECT * FROM licenses
    WHERE revoked = 0 AND license_key LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  const countActiveStmt = db.prepare(`
    SELECT COUNT(*) AS total FROM licenses WHERE revoked = 0
  `);

  return {
    revokeActiveForProduct(cfxKey, product) {
      revokeActiveStmt.run(hashCfx(cfxKey), product);
    },

    insertLicense(row) {
      return insertStmt.run(
        row.discord_id,
        row.discord_tag,
        row.cfx_key,
        row.cfx_key_hash,
        row.product,
        row.product_id,
        row.license_key,
        row.resource_name
      );
    },

    findByLicenseKey(licenseKey) {
      return findByKeyStmt.get(licenseKey);
    },

    findActiveByCfxProduct(cfxKey, product) {
      return findActiveByCfxProductStmt.get(hashCfx(cfxKey), product);
    },

    findByDiscord(discordId) {
      return findByDiscordStmt.all(discordId);
    },

    revokeById(id) {
      return revokeByIdStmt.run(id);
    },

    revokeAllByDiscord(discordId) {
      return revokeAllByDiscordStmt.run(discordId);
    },

    checkRateLimit(discordId, limitPerHour) {
      const hourBucket = new Date().toISOString().slice(0, 13);
      const row = rateGetStmt.get(discordId, hourBucket);
      const count = row?.count ?? 0;
      if (count >= limitPerHour) {
        return { allowed: false, count, hourBucket };
      }
      rateUpsertStmt.run(discordId, hourBucket);
      return { allowed: true, count: count + 1, hourBucket };
    },

    countActive() {
      return countActiveStmt.get().total;
    },

    listActive({ discordId = null, product = null, limit = 25 } = {}) {
      const cap = Math.min(Math.max(1, limit), 50);
      if (discordId && product) {
        return listActiveByProductDiscordStmt.all(product, discordId, cap);
      }
      if (discordId) return listActiveByDiscordStmt.all(discordId, cap);
      if (product) return listActiveByProductStmt.all(product, cap);
      return listActiveStmt.all(cap);
    },

    searchActiveByKeyFragment(fragment, limit = 10) {
      const q = `%${String(fragment || '').trim().toUpperCase()}%`;
      if (q === '%%') return [];
      return findActiveByKeyLikeStmt.all(q, Math.min(limit, 20));
    },
  };
}
