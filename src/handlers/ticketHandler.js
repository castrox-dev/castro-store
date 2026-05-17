import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { getGuildConfig } from '../storage.js';
import { COLORS, CUSTOM_IDS } from '../constants.js';
import { isStaff } from '../utils/permissions.js';
import { getCategoryById } from '../utils/ticketCategories.js';
import { buildTicketTopic, parseTicketTopic } from '../utils/ticketTopic.js';
import {
  applyBannerToEmbed,
  getBannerAttachment,
  getBannerKeyForCategory,
} from '../utils/banners.js';

function ticketControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ticketClaim)
      .setLabel('Assumir')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✋'),
    new ButtonBuilder()
      .setCustomId(CUSTOM_IDS.ticketClose)
      .setLabel('Fechar ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );
}

export async function openTicket(interaction, categoryId = 'geral') {
  const config = getGuildConfig(interaction.guildId);
  const category = getCategoryById(interaction.guildId, categoryId);

  if (!category) {
    return interaction.reply({
      content: 'Categoria de ticket inválida. Avise um administrador.',
      ephemeral: true,
    });
  }

  if (!config.ticketCategoryId || !config.ticketStaffRoleId) {
    return interaction.reply({
      content: 'Sistema de tickets não configurado. Avise um administrador.',
      ephemeral: true,
    });
  }

  const topic = buildTicketTopic(interaction.user.id, categoryId);
  const existing = interaction.guild.channels.cache.find(
    (ch) => ch.type === ChannelType.GuildText && ch.topic === topic
  );

  if (existing) {
    return interaction.reply({
      content: `Você já tem um ticket de **${category.label}** aberto: ${existing}`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const slug = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  const channelName = `${categoryId}-${slug || 'user'}-${interaction.user.id.slice(-4)}`.slice(
    0,
    100
  );

  const staffRole = config.ticketStaffRoleId;
  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId,
    topic,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      {
        id: staffRole,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
        id: interaction.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });

  const bannerKey = getBannerKeyForCategory(categoryId);
  let welcome = new EmbedBuilder()
    .setTitle(category.welcomeTitle ?? `🎫 ${category.label}`)
    .setDescription(
      `Olá ${interaction.user}!\n\n${category.welcomeMessage}\n\n` +
        '• Use os botões abaixo para **assumir** ou **fechar**\n' +
        '• Staff: `/ticket adicionar` e `/ticket remover`'
    )
    .addFields({ name: 'Categoria', value: category.label, inline: true })
    .setColor(COLORS.primary)
    .setFooter({ text: 'CASTRO STORE • Premium Scripts ⚡' })
    .setTimestamp();

  welcome = applyBannerToEmbed(welcome, bannerKey);

  const bannerFile = getBannerAttachment(bannerKey);
  const ticketPayload = {
    content: `<@${interaction.user.id}> <@&${staffRole}>`,
    embeds: [welcome],
    components: [ticketControls()],
  };
  if (bannerFile) ticketPayload.files = [bannerFile];

  await channel.send(ticketPayload);

  await interaction.editReply({
    content: `Ticket **${category.label}** criado: ${channel}`,
  });
}

async function buildTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = [...messages.values()].reverse();
  const lines = sorted.map((m) => {
    const time = m.createdAt.toISOString();
    const author = m.author.tag;
    const content = m.content || '[embed/anexo]';
    return `[${time}] ${author}: ${content}`;
  });
  return lines.join('\n').slice(0, 3900);
}

function isTicketChannel(channel) {
  if (!channel?.topic?.includes('ticket-owner:')) return false;
  return true;
}

export async function closeTicket(interaction, reason = 'fechado') {
  const config = getGuildConfig(interaction.guildId);
  const channel = interaction.channel;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content: 'Este não é um canal de ticket.',
      ephemeral: true,
    });
  }

  const { ownerId, tipo } = parseTicketTopic(channel.topic);
  const category = getCategoryById(interaction.guildId, tipo);
  const canClose =
    interaction.user.id === ownerId ||
    isStaff(interaction.member, config.ticketStaffRoleId);

  if (!canClose) {
    return interaction.reply({
      content: 'Apenas o dono do ticket ou a equipe pode fechar.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const transcript = await buildTranscript(channel);

  if (config.ticketLogChannelId) {
    const logChannel = await interaction.guild.channels
      .fetch(config.ticketLogChannelId)
      .catch(() => null);

    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('🔒 Ticket fechado')
        .addFields(
          { name: 'Canal', value: channel.name, inline: true },
          { name: 'Categoria', value: category?.label ?? tipo, inline: true },
          { name: 'Fechado por', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Dono', value: ownerId ? `<@${ownerId}>` : '—', inline: true },
          { name: 'Motivo', value: reason }
        )
        .setColor(COLORS.danger)
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
      if (transcript) {
        await logChannel.send({
          content: '**Transcript (últimas 100 mensagens):**',
          files: [
            {
              attachment: Buffer.from(transcript, 'utf8'),
              name: `${channel.name}-transcript.txt`,
            },
          ],
        });
      }
    }
  }

  await interaction.editReply({ content: 'Fechando ticket em 3 segundos...' });
  await channel.send(`🔒 Ticket fechado por <@${interaction.user.id}>. Canal será apagado.`);

  setTimeout(() => channel.delete().catch(() => {}), 3000);
}

export async function claimTicket(interaction) {
  const config = getGuildConfig(interaction.guildId);

  if (!isStaff(interaction.member, config.ticketStaffRoleId)) {
    return interaction.reply({
      content: 'Apenas a equipe pode assumir tickets.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setDescription(`✋ Ticket assumido por ${interaction.user}`)
    .setColor(COLORS.warning);

  await interaction.reply({ embeds: [embed] });
}
