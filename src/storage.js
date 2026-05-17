import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const FILE = join(DATA_DIR, 'guilds.json');

function ensureFile() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, '{}', 'utf8');
}

export function loadGuilds() {
  ensureFile();
  return JSON.parse(readFileSync(FILE, 'utf8'));
}

export function saveGuilds(data) {
  ensureFile();
  writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

export function getGuildConfig(guildId) {
  const all = loadGuilds();
  if (!all[guildId]) {
    all[guildId] = {
      autoroleId: null,
      ticketCategoryId: null,
      ticketStaffRoleId: null,
      ticketLogChannelId: null,
      ticketPanel: null,
      ticketCategories: null,
    };
    saveGuilds(all);
  }
  return all[guildId];
}

export function setGuildConfig(guildId, patch) {
  const all = loadGuilds();
  all[guildId] = { ...getGuildConfig(guildId), ...patch };
  saveGuilds(all);
  return all[guildId];
}
