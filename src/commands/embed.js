import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
} from 'discord.js';
import { COLORS, CUSTOM_IDS } from '../constants.js';

export const data = new SlashCommandBuilder()
  .setName('embed')
  .setDescription('Cria e envia embeds personalizados')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addSubcommand((sub) =>
    sub
      .setName('criar')
      .setDescription('Abre o editor visual de embed')
      .addChannelOption((opt) =>
        opt
          .setName('canal')
          .setDescription('Canal onde enviar (padrão: canal atual)')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('rapido')
      .setDescription('Embed rápido com título e descrição')
      .addStringOption((opt) =>
        opt.setName('titulo').setDescription('Título do embed').setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName('descricao').setDescription('Descrição do embed').setRequired(true)
      )
      .addStringOption((opt) => opt.setName('cor').setDescription('Cor em hex (#5865F2)'))
      .addStringOption((opt) => opt.setName('imagem').setDescription('URL da imagem'))
      .addChannelOption((opt) =>
        opt
          .setName('canal')
          .setDescription('Canal de destino')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
  );

function parseColor(hex) {
  if (!hex) return COLORS.primary;
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);
  return Number.isNaN(num) ? COLORS.primary : num;
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'rapido') {
    const titulo = interaction.options.getString('titulo');
    const descricao = interaction.options.getString('descricao');
    const cor = interaction.options.getString('cor');
    const imagem = interaction.options.getString('imagem');
    const canal =
      interaction.options.getChannel('canal') ?? interaction.channel;

    const embed = new EmbedBuilder()
      .setTitle(titulo)
      .setDescription(descricao)
      .setColor(parseColor(cor))
      .setTimestamp();

    if (imagem) embed.setImage(imagem);

    await canal.send({ embeds: [embed] });
    return interaction.reply({
      content: `Embed enviado em ${canal}.`,
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(CUSTOM_IDS.embedModal)
    .setTitle('Criar embed');

  const titulo = new TextInputBuilder()
    .setCustomId('titulo')
    .setLabel('Título')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(256);

  const descricao = new TextInputBuilder()
    .setCustomId('descricao')
    .setLabel('Descrição')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  const cor = new TextInputBuilder()
    .setCustomId('cor')
    .setLabel('Cor (hex, ex: #5865F2)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(7);

  const rodape = new TextInputBuilder()
    .setCustomId('rodape')
    .setLabel('Rodapé')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(2048);

  const imagem = new TextInputBuilder()
    .setCustomId('imagem')
    .setLabel('URL da imagem (opcional)')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titulo),
    new ActionRowBuilder().addComponents(descricao),
    new ActionRowBuilder().addComponents(cor),
    new ActionRowBuilder().addComponents(rodape),
    new ActionRowBuilder().addComponents(imagem)
  );

  interaction.client.pendingEmbedChannel =
    interaction.client.pendingEmbedChannel ?? new Map();
  const canal = interaction.options.getChannel('canal') ?? interaction.channel;
  interaction.client.pendingEmbedChannel.set(interaction.user.id, canal.id);

  await interaction.showModal(modal);
}

export async function handleEmbedModal(interaction) {
  const titulo = interaction.fields.getTextInputValue('titulo') || null;
  const descricao = interaction.fields.getTextInputValue('descricao');
  const cor = interaction.fields.getTextInputValue('cor');
  const rodape = interaction.fields.getTextInputValue('rodape') || null;
  const imagem = interaction.fields.getTextInputValue('imagem') || null;

  const embed = new EmbedBuilder()
    .setDescription(descricao)
    .setColor(parseColor(cor))
    .setTimestamp();

  if (titulo) embed.setTitle(titulo);
  if (rodape) embed.setFooter({ text: rodape });
  if (imagem) embed.setImage(imagem);

  const channelId =
    interaction.client.pendingEmbedChannel?.get(interaction.user.id) ??
    interaction.channelId;
  interaction.client.pendingEmbedChannel?.delete(interaction.user.id);

  const channel = await interaction.guild.channels.fetch(channelId);
  await channel.send({ embeds: [embed] });

  await interaction.reply({
    content: `Embed publicado em ${channel}.`,
    ephemeral: true,
  });
}
