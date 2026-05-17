export function buildTicketTopic(userId, tipo) {
  return `ticket-owner:${userId}|tipo:${tipo}`;
}

export function parseTicketTopic(topic) {
  if (!topic) return { ownerId: null, tipo: 'geral' };
  const ownerMatch = topic.match(/ticket-owner:([^|]+)/);
  const tipoMatch = topic.match(/tipo:([^|]+)/);
  return {
    ownerId: ownerMatch?.[1] ?? null,
    tipo: tipoMatch?.[1] ?? 'geral',
  };
}
