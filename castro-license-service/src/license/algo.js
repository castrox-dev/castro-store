/**
 * Algoritmo V3 — idêntico a generate_license.lua e server/license.lua nos tablets.
 */

export const DEFAULT_PEPPER = 'NW_LIC_V3_2026';

export const PRODUCTS = {
  police: {
    id: 'CXPD_TABLET_V3',
    prefix: 'CXPD',
    resource: 'police_tablet_licensed',
  },
  faction: {
    id: 'CXFT_TABLET_V3',
    prefix: 'CXFT',
    resource: 'faction_tablet_licensed',
  },
};

export function fnv32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function normalizeCfxKey(cfx) {
  return String(cfx || '').trim().toLowerCase().replace(/\s+/g, '');
}

export function normalizeLicenseKey(key) {
  return String(key || '').trim().toUpperCase().replace(/\s+/g, '');
}

export function computeLicenseKey(cfxLicenseKey, productKey, pepper = DEFAULT_PEPPER) {
  const product = PRODUCTS[productKey];
  if (!product) {
    throw new Error(`Produto inválido: ${productKey}. Use: police, faction`);
  }

  const sv = normalizeCfxKey(cfxLicenseKey);
  if (!sv) throw new Error('sv_licenseKey vazio');

  const raw = `${sv}|${product.id}|${pepper}`;
  const h1 = fnv32(raw);
  const h2 = fnv32(`${raw}:${h1}`);
  const key = `${product.prefix}-${h1.toString(16).toUpperCase().padStart(8, '0')}-${h2.toString(16).toUpperCase().padStart(8, '0')}`;

  return {
    key,
    productId: product.id,
    prefix: product.prefix,
    resource: product.resource,
    productKey,
  };
}

export function computeBundle(cfxLicenseKey, pepper = DEFAULT_PEPPER) {
  return {
    police: computeLicenseKey(cfxLicenseKey, 'police', pepper),
    faction: computeLicenseKey(cfxLicenseKey, 'faction', pepper),
  };
}

export function verifyLicenseKey(licenseKey, cfxLicenseKey, productKey, pepper = DEFAULT_PEPPER) {
  const expected = computeLicenseKey(cfxLicenseKey, productKey, pepper);
  return normalizeLicenseKey(licenseKey) === normalizeLicenseKey(expected.key);
}

export function productKeyFromProductId(productId) {
  for (const [key, p] of Object.entries(PRODUCTS)) {
    if (p.id === productId) return key;
  }
  return null;
}

export function cfxKeyPreview(cfx) {
  const n = normalizeCfxKey(cfx);
  if (n.length <= 16) return n;
  return `${n.slice(0, 16)}…`;
}
