import {
  computeBundle,
  computeLicenseKey,
  normalizeCfxKey,
  normalizeLicenseKey,
  productKeyFromProductId,
  verifyLicenseKey,
} from '../license/algo.js';
import { hashCfx } from '../db/index.js';

export function createLicenseService(repo, pepper) {
  function validateCfxFormat(cfx) {
    const n = normalizeCfxKey(cfx);
    if (!n.startsWith('cfxk_') || n.length < 20) {
      return { ok: false, error: 'sv_licenseKey inválido. Deve começar com cfxk_ (Keymaster Cfx.re).' };
    }
    return { ok: true, normalized: n };
  }

  function generate({ discordId, discordTag, cfxKey, productKey }) {
    const cfxCheck = validateCfxFormat(cfxKey);
    if (!cfxCheck.ok) return cfxCheck;

    const results = [];

    if (productKey === 'bundle') {
      const bundle = computeBundle(cfxCheck.normalized, pepper);
      for (const key of ['police', 'faction']) {
        const item = bundle[key];
        repo.revokeActiveForProduct(cfxCheck.normalized, key);
        repo.insertLicense({
          discord_id: discordId,
          discord_tag: discordTag || null,
          cfx_key: cfxCheck.normalized,
          cfx_key_hash: hashCfx(cfxCheck.normalized),
          product: key,
          product_id: item.productId,
          license_key: item.key,
          resource_name: item.resource,
        });
        results.push(item);
      }
      return { ok: true, bundle: true, items: results, cfxPreview: cfxCheck.normalized.slice(0, 16) };
    }

    const item = computeLicenseKey(cfxCheck.normalized, productKey, pepper);
    repo.revokeActiveForProduct(cfxCheck.normalized, productKey);
    repo.insertLicense({
      discord_id: discordId,
      discord_tag: discordTag || null,
      cfx_key: cfxCheck.normalized,
      cfx_key_hash: hashCfx(cfxCheck.normalized),
      product: productKey,
      product_id: item.productId,
      license_key: item.key,
      resource_name: item.resource,
    });

    return { ok: true, bundle: false, items: [item], cfxPreview: cfxCheck.normalized.slice(0, 16) };
  }

  function validateForApi({ licenseKey, productId, cfxKey, resource }) {
    const normalizedKey = normalizeLicenseKey(licenseKey);
    const normalizedCfx = normalizeCfxKey(cfxKey);

    if (!normalizedKey || !productId || !normalizedCfx) {
      return { valid: false, reason: 'missing_fields', status: 400 };
    }

    const productKey = productKeyFromProductId(productId);
    if (!productKey) {
      return { valid: false, reason: 'unknown_product', status: 400 };
    }

    const row = repo.findByLicenseKey(normalizedKey);
    if (!row) {
      return { valid: false, reason: 'not_registered', status: 403 };
    }

    if (row.revoked) {
      return { valid: false, reason: 'revoked', status: 403 };
    }

    if (row.product_id !== productId) {
      return { valid: false, reason: 'product_mismatch', status: 403 };
    }

    if (resource && row.resource_name !== resource) {
      return { valid: false, reason: 'resource_mismatch', status: 403 };
    }

    if (hashCfx(normalizedCfx) !== row.cfx_key_hash) {
      return { valid: false, reason: 'cfx_mismatch', status: 403 };
    }

    if (!verifyLicenseKey(normalizedKey, normalizedCfx, productKey, pepper)) {
      return { valid: false, reason: 'invalid_algorithm', status: 403 };
    }

    return { valid: true, reason: 'ok', status: 200, licenseId: row.id };
  }

  function getStatusForDiscord(discordId) {
    const rows = repo.findByDiscord(discordId);
    const active = rows.filter((r) => !r.revoked);
    const revoked = rows.filter((r) => r.revoked);
    return { active, revoked, total: rows.length };
  }

  function revoke({ licenseId, discordId }) {
    if (licenseId) {
      const info = repo.revokeById(licenseId);
      return { ok: info.changes > 0, count: info.changes };
    }
    if (discordId) {
      const info = repo.revokeAllByDiscord(discordId);
      return { ok: info.changes > 0, count: info.changes };
    }
    return { ok: false, count: 0, error: 'licenseId ou discordId obrigatório' };
  }

  return {
    generate,
    validateForApi,
    getStatusForDiscord,
    revoke,
    validateCfxFormat,
  };
}
