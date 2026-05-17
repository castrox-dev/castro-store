import dotenv from 'dotenv';

dotenv.config();

function parseIdList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID || '',
    guildId: process.env.DISCORD_GUILD_ID || '',
  },
  roles: {
    staff: parseIdList(process.env.STAFF_ROLE_IDS),
    buyer: parseIdList(process.env.BUYER_ROLE_IDS),
  },
  rateLimitPerHour: Number(process.env.GENERATE_RATE_LIMIT_PER_HOUR) || 3,
  auditWebhookUrl: process.env.AUDIT_WEBHOOK_URL || '',
  api: {
    host: process.env.API_HOST || '0.0.0.0',
    port: Number(process.env.API_PORT) || 3847,
    secret: process.env.LICENSE_API_SECRET || '',
  },
  pepper: process.env.LICENSE_PEPPER || 'NW_LIC_V3_2026',
  databasePath: process.env.DATABASE_PATH || './data/licenses.db',
};

export function assertConfig() {
  const missing = [];
  if (!config.discord.token) missing.push('DISCORD_TOKEN');
  if (!config.discord.clientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.api.secret) missing.push('LICENSE_API_SECRET');
  if (missing.length) {
    throw new Error(`Variáveis obrigatórias em falta no .env: ${missing.join(', ')}`);
  }
}
