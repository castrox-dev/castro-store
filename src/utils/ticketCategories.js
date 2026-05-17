import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getGuildConfig, setGuildConfig } from '../storage.js';

export const TICKET_OPEN_PREFIX = 'ticket:open:';

export const DEFAULT_TICKET_CATEGORIES = [
  {
    id: 'comprar',
    label: 'Comprar',
    emoji: '💰',
    style: ButtonStyle.Success,
    welcomeTitle: '💰 Ticket — Compras',
    welcomeMessage:
      'Informe qual script deseja, forma de pagamento e se já é cliente.\nA equipe de vendas responderá em breve.',
  },
  {
    id: 'suporte',
    label: 'Suporte',
    emoji: '🛠️',
    style: ButtonStyle.Primary,
    welcomeTitle: '🛠️ Ticket — Suporte',
    welcomeMessage:
      'Descreva o erro ou dúvida (prints, nome do script, versão do FiveM).\nQuanto mais detalhes, mais rápido resolvemos.',
  },
  {
    id: 'licenca',
    label: 'Licença',
    emoji: '🔑',
    style: ButtonStyle.Secondary,
    welcomeTitle: '🔑 Ticket — Licença',
    welcomeMessage:
      'Envie seu e-mail de compra, key ou comprovante para ativar/renovar sua licença.',
  },
  {
    id: 'parceria',
    label: 'Parceria',
    emoji: '🤝',
    style: ButtonStyle.Secondary,
    welcomeTitle: '🤝 Ticket — Parceria',
    welcomeMessage:
      'Conte sobre seu servidor/projeto e o tipo de parceria que busca.',
  },
];

const STYLE_MAP = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

export function styleFromName(name) {
  return STYLE_MAP[name] ?? ButtonStyle.Secondary;
}

export function styleToName(style) {
  const entry = Object.entries(STYLE_MAP).find(([, v]) => v === style);
  return entry?.[0] ?? 'Secondary';
}

export function getCategories(guildId) {
  const config = getGuildConfig(guildId);
  const list = config.ticketCategories;
  if (!list?.length) return [...DEFAULT_TICKET_CATEGORIES];
  return list;
}

export function setCategories(guildId, categories) {
  setGuildConfig(guildId, { ticketCategories: categories });
}

export function getCategoryById(guildId, id) {
  return getCategories(guildId).find((c) => c.id === id);
}

export function buildTicketPanelRows(guildId) {
  const categories = getCategories(guildId);
  const rows = [];
  let current = new ActionRowBuilder();

  for (const cat of categories) {
    if (current.components.length === 5) {
      rows.push(current);
      current = new ActionRowBuilder();
    }
    if (rows.length >= 5) break;

    const btn = new ButtonBuilder()
      .setCustomId(`${TICKET_OPEN_PREFIX}${cat.id}`)
      .setLabel(cat.label)
      .setStyle(cat.style ?? ButtonStyle.Secondary);

    if (cat.emoji) btn.setEmoji(cat.emoji);
    current.addComponents(btn);
  }

  if (current.components.length > 0 && rows.length < 5) rows.push(current);
  return rows;
}
