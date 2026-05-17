import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { welcomeChannelId } from '../config.js';
import { getGuildConfig } from '../storage.js';
import { computeLicenseKey } from '../../castro-license-service/src/license/algo.js';
import { getWelcomePayload } from '../utils/welcome.js';
import { COLORS } from '../constants.js';

export const data = new SlashCommandBuilder()
  .setName('testar')
  .setDescription('Testa funções do bot (preview)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName('bemvindo')
      .setDescription('Envia a mensagem de boas-vindas (como se você tivesse entrado)')
  )
  .addSubcommand((sub) =>
    sub
      .setName('bot')
      .setDescription('Mostra status e configurações do bot')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'bot') {
    const config = getGuildConfig(interaction.guildId);
    const v3Test = computeLicenseKey('cfxk_test123456789012345678901234', 'police');
    const licencaV3 = interaction.client.licenseService ? '✓ ativo' : '✗ offline';
    const apiV3 = process.env.LICENSE_API_SECRET ? '✓ configurada' : '✗ sem secret';
    const ping = Math.round(interaction.client.ws.ping);
    const uptime = formatUptime(interaction.client.uptime);

    const embed = new EmbedBuilder()
      .setTitle('CASTRO STORE — Diagnóstico')
      .setColor(COLORS.primary)
      .addFields(
        { name: 'Ping', value: `${ping}ms`, inline: true },
        { name: 'Online há', value: uptime, inline: true },
        { name: 'Servidores', value: `${interaction.client.guilds.cache.size}`, inline: true },
        {
          name: 'Canal de boas-vindas',
          value: welcomeChannelId ? `<#${welcomeChannelId}>` : 'não configurado',
          inline: true,
        },
        {
          name: 'Autorole',
          value: config.autoroleId ? `<@&${config.autoroleId}>` : 'não configurado',
          inline: true,
        },
        {
          name: 'Tickets',
          value:
            config.ticketCategoryId && config.ticketStaffRoleId
              ? 'configurado ✓'
              : 'use `/ticket configurar`',
          inline: true,
        },
        {
          name: 'Licenças V3',
          value: licencaV3,
          inline: true,
        },
        {
          name: 'API validação',
          value: apiV3,
          inline: true,
        },
        {
          name: 'Teste algoritmo',
          value: `\`${v3Test.key}\``,
          inline: false,
        }
      )
      .setFooter({ text: 'CASTRO STORE • Premium Scripts ⚡' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'bemvindo') {
    const member = interaction.member;
    const payload = getWelcomePayload(member);

    const canalAlvo = welcomeChannelId
      ? await interaction.guild.channels.fetch(welcomeChannelId).catch(() => null)
      : interaction.channel;

    if (!canalAlvo?.isTextBased()) {
      return interaction.reply({
        content: 'Canal de boas-vindas inválido. Verifique `WELCOME_CHANNEL_ID` no `.env`.',
        ephemeral: true,
      });
    }

    await canalAlvo.send(payload);

    const noCanalAtual = welcomeChannelId && canalAlvo.id !== interaction.channelId;

    return interaction.reply({
      content: noCanalAtual
        ? `Mensagem de teste enviada em ${canalAlvo}.`
        : 'Mensagem de teste enviada neste canal.',
      ephemeral: true,
    });
  }
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
