import { config } from '../config.js';
import { cfxKeyPreview } from '../license/algo.js';

export async function sendAuditLog({ action, user, product, cfxKey, licenseKeys = [] }) {
  if (!config.auditWebhookUrl) return;

  const keysPreview = licenseKeys.map((k) => `\`${k.slice(0, 12)}…\``).join(', ') || '—';

  const body = {
    embeds: [
      {
        title: `Licença V3 — ${action}`,
        color: action.includes('REVOKE') ? 0xe74c3c : 0x2ecc71,
        fields: [
          { name: 'Utilizador', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: 'Produto', value: product || '—', inline: true },
          { name: 'Cfx (preview)', value: `\`${cfxKeyPreview(cfxKey)}\``, inline: true },
          { name: 'Chaves', value: keysPreview, inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await fetch(config.auditWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn('[audit] Falha ao enviar webhook:', err.message);
  }
}
