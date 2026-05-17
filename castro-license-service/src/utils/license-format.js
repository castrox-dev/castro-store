const PRODUCT_LABELS = {
  police: 'Police (CXPD)',
  faction: 'Faction (CXFT)',
};

export function productLabel(product) {
  return PRODUCT_LABELS[product] || product;
}

export function maskCfx(cfxKey) {
  const s = String(cfxKey || '');
  if (s.length <= 20) return s;
  return `${s.slice(0, 16)}…`;
}

export function formatDiscordUser(row) {
  const mention = `<@${row.discord_id}>`;
  const tag = row.discord_tag ? ` (\`${row.discord_tag}\`)` : '';
  return `${mention}${tag}`;
}

/** SQLite datetime → duração legível em PT */
export function formatActiveDuration(createdAt) {
  if (!createdAt) return '—';
  const normalized = String(createdAt).includes('T')
    ? createdAt
    : `${String(createdAt).replace(' ', 'T')}Z`;
  const created = new Date(normalized);
  if (Number.isNaN(created.getTime())) return '—';

  const ms = Math.max(0, Date.now() - created.getTime());
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) {
    const h = hr % 24;
    return h > 0 ? `${day}d ${h}h` : `${day} dia${day > 1 ? 's' : ''}`;
  }
  if (hr > 0) return `${hr}h ${min % 60}min`;
  if (min > 0) return `${min} min`;
  return `${sec}s`;
}

export function formatCreatedAt(createdAt) {
  if (!createdAt) return '—';
  const normalized = String(createdAt).includes('T')
    ? createdAt
    : `${String(createdAt).replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return createdAt;
  return d.toLocaleString('pt-PT', { timeZone: 'UTC', dateStyle: 'short', timeStyle: 'short' }) + ' UTC';
}
