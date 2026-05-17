import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
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

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

export function createLicenseRepo(db) {
  const insertStmt = db.prepare(`
    INSERT INTO licenses (discord_id, discord_tag, cfx_key, cfx_key_hash, product, product_id, license_key, resource_name, revoked)
    VALUES (@discord_id, @discord_tag, @cfx_key, @cfx_key_hash, @product, @product_id, @license_key, @resource_name, 0)
  `);

  const revokeActiveStmt = db.prepare(`
    UPDATE licenses
    SET revoked = 1, revoked_at = datetime('now')
    WHERE cfx_key_hash = @cfx_key_hash AND product = @product AND revoked = 0
  `);

  const findByKeyStmt = db.prepare(`
    SELECT * FROM licenses WHERE license_key = @license_key AND revoked = 0 ORDER BY id DESC LIMIT 1
  `);

  const findActiveByCfxProductStmt = db.prepare(`
    SELECT * FROM licenses
    WHERE cfx_key_hash = @cfx_key_hash AND product = @product AND revoked = 0
    ORDER BY id DESC LIMIT 1
  `);

  const findByDiscordStmt = db.prepare(`
    SELECT * FROM licenses WHERE discord_id = @discord_id ORDER BY created_at DESC LIMIT 20
  `);

  const revokeByIdStmt = db.prepare(`
    UPDATE licenses SET revoked = 1, revoked_at = datetime('now') WHERE id = @id AND revoked = 0
  `);

  const revokeAllByDiscordStmt = db.prepare(`
    UPDATE licenses SET revoked = 1, revoked_at = datetime('now')
    WHERE discord_id = @discord_id AND revoked = 0
  `);

  const rateGetStmt = db.prepare(`
    SELECT count FROM rate_limits WHERE discord_id = @discord_id AND hour_bucket = @hour_bucket
  `);

  const rateUpsertStmt = db.prepare(`
    INSERT INTO rate_limits (discord_id, hour_bucket, count) VALUES (@discord_id, @hour_bucket, 1)
    ON CONFLICT(discord_id, hour_bucket) DO UPDATE SET count = count + 1
  `);

  return {
    revokeActiveForProduct(cfxKey, product) {
      revokeActiveStmt.run({
        cfx_key_hash: hashCfx(cfxKey),
        product,
      });
    },

    insertLicense(row) {
      return insertStmt.run(row);
    },

    findByLicenseKey(licenseKey) {
      return findByKeyStmt.get({ license_key: licenseKey });
    },

    findActiveByCfxProduct(cfxKey, product) {
      return findActiveByCfxProductStmt.get({
        cfx_key_hash: hashCfx(cfxKey),
        product,
      });
    },

    findByDiscord(discordId) {
      return findByDiscordStmt.all({ discord_id: discordId });
    },

    revokeById(id) {
      return revokeByIdStmt.run({ id });
    },

    revokeAllByDiscord(discordId) {
      return revokeAllByDiscordStmt.run({ discord_id: discordId });
    },

    checkRateLimit(discordId, limitPerHour) {
      const hourBucket = new Date().toISOString().slice(0, 13);
      const row = rateGetStmt.get({ discord_id: discordId, hour_bucket: hourBucket });
      const count = row?.count ?? 0;
      if (count >= limitPerHour) {
        return { allowed: false, count, hourBucket };
      }
      rateUpsertStmt.run({ discord_id: discordId, hour_bucket: hourBucket });
      return { allowed: true, count: count + 1, hourBucket };
    },
  };
}
