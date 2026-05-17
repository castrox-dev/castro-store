import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { canGenerate, canRevoke, isStaff } from './permissions.js';
import { sendAuditLog } from '../services/audit.js';
import { config } from '../config.js';
import {
  formatActiveDuration,
  formatCreatedAt,
  formatDiscordUser,
  maskCfx,
  productLabel,
} from '../utils/license-format.js';
import { normalizeLicenseKey } from '../license/algo.js';

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('gerar-licenca')
    .setDescription('Gera licença V3 para Police / Faction Tablet')
    .addStringOption((o) =>
      o.setName('cfx_key').setDescription('sv_licenseKey do servidor (cfxk_...)').setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName('produto')
        .setDescription('Qual tablet')
        .setRequired(true)
        .addChoices(
          { name: 'Police Tablet (CXPD)', value: 'police' },
          { name: 'Faction Tablet (CXFT)', value: 'faction' },
          { name: 'Bundle (Police + Faction)', value: 'bundle' }
        )
    )
    .addUserOption((o) =>
      o.setName('cliente').setDescription('Cliente (no ticket detecta automaticamente)')
    )
    .addBooleanOption((o) =>
      o
        .setName('publicar')
        .setDescription('Mostrar embed no canal (ticket = sim por padrão)')
    ),

  new SlashCommandBuilder()
    .setName('revogar-licenca')
    .setDescription('Revoga licença(s) ativas (staff)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName('usuario').setDescription('Revogar todas as licenças deste utilizador'))
    .addIntegerOption((o) => o.setName('id').setDescription('ID interno da licença na base de dados')),

  new SlashCommandBuilder()
    .setName('status-licenca')
    .setDescription('Mostra as tuas licenças (ou de outro user, se staff)')
    .addUserOption((o) => o.setName('usuario').setDescription('Staff: ver licenças de outro utilizador')),

  new SlashCommandBuilder()
    .setName('keys-ativas')
    .setDescription('Staff: lista keys ativas, clientes e tempo de ativação')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName('chave').setDescription('Filtrar por key (completa ou parte, ex: NWPD-ABC)')
    )
    .addUserOption((o) => o.setName('cliente').setDescription('Filtrar por cliente Discord'))
    .addStringOption((o) =>
      o
        .setName('produto')
        .setDescription('Filtrar por produto')
        .addChoices(
          { name: 'Police', value: 'police' },
          { name: 'Faction', value: 'faction' }
        )
    ),
].map((c) => c.toJSON());

function parseTicketOwnerId(channel) {
  const topic = channel?.topic;
  if (!topic?.includes('ticket-owner:')) return null;
  const match = topic.match(/ticket-owner:([^|]+)/);
  return match?.[1] ?? null;
}

function isTicketChannel(channel) {
  return Boolean(parseTicketOwnerId(channel));
}

function buildLicenseEmbed(result, productLabel, { forClient = false, staffUser = null } = {}) {
  const embed = new EmbedBuilder()
    .setTitle(`Licença V3 — ${productLabel}`)
    .setColor(0x00a8ff)
    .setDescription(
      forClient
        ? 'A sua licença foi gerada. Cole no `config.lua` do resource e reinicie o script.\n**1 servidor = 1 chave.**'
        : 'Cole **apenas** no `config.lua` do resource indicado. **1 servidor = 1 chave por produto.**'
    )
    .setFooter({ text: 'CASTRO STORE • CXPD/CXFT não são intercambiáveis' })
    .setTimestamp();

  if (staffUser && forClient) {
    embed.addFields({
      name: 'Atendido por',
      value: `${staffUser}`,
      inline: true,
    });
  }

  for (const item of result.items) {
    embed.addFields({
      name: `${item.resource} (\`${item.productId}\`)`,
      value: `\`\`\`lua\nConfig.LicenseKey = '${item.key}'\n\`\`\``,
    });
  }

  if (config.api.port && !forClient) {
    embed.addFields({
      name: 'API (opcional — só staff vê detalhes)',
      value: `\`\`\`lua\nConfig.LicenseApiUrl = 'http://SEU_IP:${config.api.port}/v1/license/validate'\nConfig.LicenseApiSecret = '(ver staff)'\n\`\`\``,
      inline: false,
    });
  }

  return embed;
}

function buildKeyDetailEmbed(row) {
  return new EmbedBuilder()
    .setTitle(`Key ativa #${row.id}`)
    .setColor(0x3498db)
    .addFields(
      { name: 'Licença', value: `\`${row.license_key}\``, inline: false },
      { name: 'Cliente', value: formatDiscordUser(row), inline: false },
      { name: 'Discord ID', value: `\`${row.discord_id}\``, inline: true },
      { name: 'Produto', value: productLabel(row.product), inline: true },
      { name: 'Resource', value: `\`${row.resource_name}\``, inline: true },
      { name: 'Product ID', value: `\`${row.product_id}\``, inline: true },
      { name: 'Servidor (CFX)', value: `\`${maskCfx(row.cfx_key)}\``, inline: true },
      { name: 'Registada em', value: formatCreatedAt(row.created_at), inline: true },
      { name: 'Ativa há', value: formatActiveDuration(row.created_at), inline: true }
    )
    .setFooter({ text: 'CASTRO STORE • Staff' })
    .setTimestamp();
}

function buildActiveKeysListEmbed(rows, { totalActive, filters }) {
  const filterParts = [];
  if (filters.chave) filterParts.push(`chave: \`${filters.chave}\``);
  if (filters.clienteId) filterParts.push(`cliente: <@${filters.clienteId}>`);
  if (filters.produto) filterParts.push(`produto: ${productLabel(filters.produto)}`);

  const embed = new EmbedBuilder()
    .setTitle('Keys ativas')
    .setColor(0x2ecc71)
    .setDescription(
      filterParts.length ? `Filtros: ${filterParts.join(' • ')}` : 'Todas as licenças ativas na base de dados.'
    )
    .setFooter({
      text: `Mostrando ${rows.length} de ${totalActive} ativa(s) • CASTRO STORE`,
    })
    .setTimestamp();

  if (rows.length === 0) {
    embed.addFields({ name: 'Resultado', value: '_Nenhuma key ativa com estes filtros._' });
    return embed;
  }

  const lines = rows.map((r) => {
    const duration = formatActiveDuration(r.created_at);
    const keyShort =
      r.license_key.length > 22 ? `${r.license_key.slice(0, 20)}…` : r.license_key;
    return (
      `**#${r.id}** \`${keyShort}\`\n` +
      `└ ${formatDiscordUser(r)} · **${productLabel(r.product)}** · há **${duration}** · ${formatCreatedAt(r.created_at)}`
    );
  });

  let chunk = '';
  let fieldIndex = 1;
  for (const line of lines) {
    const next = chunk ? `${chunk}\n\n${line}` : line;
    if (next.length > 1000) {
      embed.addFields({ name: `Licenças (${fieldIndex})`, value: chunk });
      chunk = line;
      fieldIndex += 1;
    } else {
      chunk = next;
    }
  }
  if (chunk) {
    embed.addFields({ name: fieldIndex === 1 ? 'Licenças' : `Licenças (${fieldIndex})`, value: chunk });
  }

  if (totalActive > rows.length) {
    embed.addFields({
      name: 'Mais resultados',
      value: `Existem **${totalActive - rows.length}** key(s) ativa(s) não mostradas. Use \`chave\`, \`cliente\` ou \`produto\` para filtrar.`,
      inline: false,
    });
  }

  return embed;
}

export function createCommandHandlers(licenseService, repo) {
  return {
    async 'gerar-licenca'(interaction) {
      const access = canGenerate(interaction.member);
      if (!access.allowed) {
        return interaction.reply({
          content: 'Sem permissão. Precisas do cargo de comprador ou staff.',
          ephemeral: true,
        });
      }

      if (!access.staff) {
        const rate = repo.checkRateLimit(interaction.user.id, config.rateLimitPerHour);
        if (!rate.allowed) {
          return interaction.reply({
            content: `Limite atingido (${config.rateLimitPerHour}/hora). Tenta mais tarde ou abre ticket.`,
            ephemeral: true,
          });
        }
      }

      await interaction.deferReply({ ephemeral: true });

      const cfxKey = interaction.options.getString('cfx_key', true);
      const product = interaction.options.getString('produto', true);
      const inTicket = isTicketChannel(interaction.channel);
      const ticketOwnerId = parseTicketOwnerId(interaction.channel);
      const clienteOpt = interaction.options.getUser('cliente');
      const publicarOpt = interaction.options.getBoolean('publicar');

      const clientId = clienteOpt?.id ?? ticketOwnerId ?? interaction.user.id;
      const clientTag = clienteOpt?.tag ?? null;

      const shouldPublish =
        publicarOpt === true || (publicarOpt !== false && inTicket);

      const result = licenseService.generate({
        discordId: clientId,
        discordTag: clientTag,
        cfxKey,
        productKey: product,
      });

      if (!result.ok) {
        return interaction.editReply({ content: `Erro: ${result.error}` });
      }

      const label =
        product === 'bundle' ? 'Bundle' : product === 'police' ? 'Police' : 'Faction';

      await sendAuditLog({
        action: 'GERAR',
        user: interaction.user,
        product: label,
        cfxKey,
        licenseKeys: result.items.map((i) => i.key),
      });

      const embedStaff = buildLicenseEmbed(result, label, { forClient: false });
      const embedClient = buildLicenseEmbed(result, label, {
        forClient: true,
        staffUser: interaction.user,
      });

      if (shouldPublish && interaction.channel?.isTextBased()) {
        const mention = clientId !== interaction.user.id ? `<@${clientId}>` : '';
        await interaction.channel.send({
          content: mention
            ? `${mention} — a sua licença **${label}** está pronta! 🔑`
            : `Licença **${label}** gerada:`,
          embeds: [embedClient],
          allowedMentions: clientId ? { users: [clientId] } : { parse: [] },
        });
      }

      const staffMsg = shouldPublish
        ? `Licença gerada e **publicada neste canal** para <@${clientId}>.`
        : 'Licença gerada (só você vê esta mensagem).';

      return interaction.editReply({
        content: staffMsg,
        embeds: [embedStaff],
      });
    },

    async 'revogar-licenca'(interaction) {
      if (!canRevoke(interaction.member)) {
        return interaction.reply({ content: 'Apenas staff.', ephemeral: true });
      }

      const user = interaction.options.getUser('usuario');
      const licenseId = interaction.options.getInteger('id');

      if (!user && !licenseId) {
        return interaction.reply({
          content: 'Indica `usuario` ou `id` da licença.',
          ephemeral: true,
        });
      }

      const result = licenseService.revoke({
        licenseId: licenseId ?? null,
        discordId: user?.id ?? null,
      });

      if (!result.ok) {
        return interaction.reply({
          content: 'Nenhuma licença ativa encontrada para revogar.',
          ephemeral: true,
        });
      }

      await sendAuditLog({
        action: 'REVOGAR',
        user: interaction.user,
        product: licenseId ? `id:${licenseId}` : user.tag,
        cfxKey: '—',
      });

      return interaction.reply({
        content: `Revogada(s) **${result.count}** licença(s). O FiveM bloqueia na próxima validação (até 6h se API desligada no cliente).`,
        ephemeral: true,
      });
    },

    async 'status-licenca'(interaction) {
      const targetUser = interaction.options.getUser('usuario') || interaction.user;

      if (targetUser.id !== interaction.user.id && !isStaff(interaction.member)) {
        return interaction.reply({
          content: 'Só podes ver as tuas licenças.',
          ephemeral: true,
        });
      }

      const { active, revoked, total } = licenseService.getStatusForDiscord(targetUser.id);

      if (total === 0) {
        return interaction.reply({
          content: `Nenhuma licença registada para ${targetUser.tag}.`,
          ephemeral: true,
        });
      }

      const lines = active.length
        ? active.map(
            (r) =>
              `• **${r.product}** — \`${r.license_key.slice(0, 14)}…\` — ${r.resource_name} — ${r.created_at}`
          )
        : ['_(nenhuma ativa)_'];

      const embed = new EmbedBuilder()
        .setTitle(`Licenças — ${targetUser.tag}`)
        .setColor(active.length ? 0x2ecc71 : 0x95a5a6)
        .addFields(
          { name: `Ativas (${active.length})`, value: lines.join('\n').slice(0, 1024) },
          { name: 'Revogadas', value: String(revoked.length), inline: true },
          { name: 'Total', value: String(total), inline: true }
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async 'keys-ativas'(interaction) {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Apenas staff.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const chaveOpt = interaction.options.getString('chave');
      const cliente = interaction.options.getUser('cliente');
      const produto = interaction.options.getString('produto');

      const filters = {
        chave: chaveOpt,
        clienteId: cliente?.id ?? null,
        produto,
      };

      if (chaveOpt) {
        const normalized = normalizeLicenseKey(chaveOpt);
        const exact = repo.findByLicenseKey(normalized);
        const rows = exact ? [exact] : repo.searchActiveByKeyFragment(normalized, 10);

        if (rows.length === 0) {
          return interaction.editReply({
            content: `Nenhuma key ativa encontrada para \`${chaveOpt}\`.`,
          });
        }

        if (rows.length === 1) {
          return interaction.editReply({ embeds: [buildKeyDetailEmbed(rows[0])] });
        }

        const totalActive = repo.countActive();
        return interaction.editReply({
          content: `**${rows.length}** keys ativas correspondem a \`${chaveOpt}\`. Detalhe de cada uma abaixo (use a key completa para ver só uma):`,
          embeds: rows.slice(0, 5).map((r) => buildKeyDetailEmbed(r)),
        });
      }

      const totalActive = repo.countActive();
      const rows = repo.listActive({
        discordId: cliente?.id ?? null,
        product: produto,
        limit: 25,
      });

      return interaction.editReply({
        embeds: [buildActiveKeysListEmbed(rows, { totalActive, filters })],
      });
    },
  };
}
