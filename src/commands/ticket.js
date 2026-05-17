import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} from 'discord.js';
import { getGuildConfig, setGuildConfig } from '../storage.js';
import { COLORS } from '../constants.js';
import {
  getCategories,
  setCategories,
  buildTicketPanelRows,
  DEFAULT_TICKET_CATEGORIES,
  styleFromName,
  styleToName,
} from '../utils/ticketCategories.js';
import {
  applyBannerToEmbed,
  getBannerAttachment,
} from '../utils/banners.js';

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Sistema de tickets (estilo Ticket Tool)')
  .addSubcommand((sub) =>
    sub
      .setName('configurar')
      .setDescription('Define categoria, staff e logs dos tickets')
      .addChannelOption((opt) =>
        opt
          .setName('categoria')
          .setDescription('Categoria onde os tickets serão criados')
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(true)
      )
      .addRoleOption((opt) =>
        opt.setName('staff').setDescription('Cargo da equipe de suporte').setRequired(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName('logs')
          .setDescription('Canal para logs ao fechar ticket')
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('painel')
      .setDescription('Publica o painel com botões (Comprar, Suporte, etc.)')
      .addChannelOption((opt) =>
        opt
          .setName('canal')
          .setDescription('Canal do painel (padrão: atual)')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      )
      .addStringOption((opt) =>
        opt.setName('titulo').setDescription('Título do painel')
      )
      .addStringOption((opt) =>
        opt.setName('descricao').setDescription('Descrição do painel')
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName('botao')
      .setDescription('Gerencia os botões do painel de tickets')
      .addSubcommand((sub) =>
        sub
          .setName('adicionar')
          .setDescription('Adiciona um botão ao painel')
          .addStringOption((opt) =>
            opt
              .setName('id')
              .setDescription('ID único (ex: comprar, suporte)')
              .setRequired(true)
          )
          .addStringOption((opt) =>
            opt.setName('nome').setDescription('Texto do botão').setRequired(true)
          )
          .addStringOption((opt) =>
            opt.setName('emoji').setDescription('Emoji do botão (ex: 💰)')
          )
          .addStringOption((opt) =>
            opt
              .setName('estilo')
              .setDescription('Cor do botão')
              .addChoices(
                { name: 'Azul (Primary)', value: 'Primary' },
                { name: 'Cinza (Secondary)', value: 'Secondary' },
                { name: 'Verde (Success)', value: 'Success' },
                { name: 'Vermelho (Danger)', value: 'Danger' }
              )
          )
          .addStringOption((opt) =>
            opt
              .setName('mensagem')
              .setDescription('Texto exibido dentro do ticket ao abrir')
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('remover')
          .setDescription('Remove um botão do painel')
          .addStringOption((opt) =>
            opt.setName('id').setDescription('ID do botão').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub.setName('listar').setDescription('Lista os botões configurados')
      )
      .addSubcommand((sub) =>
        sub
          .setName('padrao')
          .setDescription('Restaura Comprar, Suporte, Licença e Parceria')
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('adicionar')
      .setDescription('Adiciona um membro ao ticket atual')
      .addUserOption((opt) =>
        opt.setName('membro').setDescription('Membro').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remover')
      .setDescription('Remove um membro do ticket atual')
      .addUserOption((opt) =>
        opt.setName('membro').setDescription('Membro').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('fechar').setDescription('Fecha o ticket atual')
  );

function ticketPanelEmbed(titulo, descricao, guildId) {
  const categories = getCategories(guildId);
  const lista = categories.map((c) => `${c.emoji ?? '•'} **${c.label}**`).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(titulo ?? 'CASTRO STORE | Central de atendimento')
    .setDescription(
      descricao ??
        '**Scripts Premium FiveM** — escolha uma opção abaixo.\n' +
          'Abrimos um canal **privado** entre você e nossa equipe.\n\n' +
          '**Categorias:**\n' +
          lista
    )
    .setColor(COLORS.primary)
    .setFooter({ text: 'CASTRO STORE • Premium Scripts ⚡' });

  return applyBannerToEmbed(embed, 'produtos');
}

function slugifyId(raw) {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 20);
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const group = interaction.options.getSubcommandGroup(false);

  if (sub === 'configurar') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'Apenas administradores podem configurar tickets.',
        ephemeral: true,
      });
    }

    const categoria = interaction.options.getChannel('categoria');
    const staff = interaction.options.getRole('staff');
    const logs = interaction.options.getChannel('logs');

    setGuildConfig(interaction.guildId, {
      ticketCategoryId: categoria.id,
      ticketStaffRoleId: staff.id,
      ticketLogChannelId: logs?.id ?? null,
    });

    return interaction.reply({
      content:
        `Tickets configurados.\n` +
        `• Categoria: ${categoria}\n` +
        `• Staff: ${staff}\n` +
        `• Logs: ${logs ?? 'não definido'}\n\n` +
        `Use \`/ticket painel\` para publicar o painel com botões.`,
      ephemeral: true,
    });
  }

  if (sub === 'painel') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'Apenas administradores podem publicar o painel.',
        ephemeral: true,
      });
    }

    const config = getGuildConfig(interaction.guildId);
    if (!config.ticketCategoryId || !config.ticketStaffRoleId) {
      return interaction.reply({
        content: 'Configure primeiro com `/ticket configurar`.',
        ephemeral: true,
      });
    }

    const canal = interaction.options.getChannel('canal') ?? interaction.channel;
    const titulo = interaction.options.getString('titulo');
    const descricao = interaction.options.getString('descricao');
    const rows = buildTicketPanelRows(interaction.guildId);

    if (!rows.length) {
      return interaction.reply({
        content: 'Nenhum botão configurado. Use `/ticket botao padrao` ou `/ticket botao adicionar`.',
        ephemeral: true,
      });
    }

    const embed = ticketPanelEmbed(titulo, descricao, interaction.guildId);
    const bannerFile = getBannerAttachment('produtos');
    const payload = { embeds: [embed], components: rows };
    if (bannerFile) payload.files = [bannerFile];

    const msg = await canal.send(payload);

    setGuildConfig(interaction.guildId, {
      ticketPanel: { channelId: canal.id, messageId: msg.id },
    });

    const total = getCategories(interaction.guildId).length;
    return interaction.reply({
      content: `Painel publicado em ${canal} com **${total}** botão(ões).`,
      ephemeral: true,
    });
  }

  if (group === 'botao') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'Apenas administradores podem gerenciar botões.',
        ephemeral: true,
      });
    }

    if (sub === 'padrao') {
      setCategories(interaction.guildId, null);
      return interaction.reply({
        content:
          'Botões padrão restaurados: **Comprar**, **Suporte**, **Licença**, **Parceria**.\n' +
          'Use `/ticket painel` para republicar.',
        ephemeral: true,
      });
    }

    if (sub === 'listar') {
      const cats = getCategories(interaction.guildId);
      const lines = cats.map(
        (c) =>
          `• \`${c.id}\` — ${c.emoji ?? ''} **${c.label}** (${styleToName(c.style)})`
      );
      return interaction.reply({
        content: `**Botões do painel:**\n${lines.join('\n')}`,
        ephemeral: true,
      });
    }

    if (sub === 'remover') {
      const id = slugifyId(interaction.options.getString('id'));
      const cats = getCategories(interaction.guildId).filter((c) => c.id !== id);

      if (cats.length === getCategories(interaction.guildId).length) {
        return interaction.reply({
          content: `Botão \`${id}\` não encontrado.`,
          ephemeral: true,
        });
      }

      setCategories(interaction.guildId, cats);
      return interaction.reply({
        content: `Botão \`${id}\` removido. Republica com \`/ticket painel\`.`,
        ephemeral: true,
      });
    }

    if (sub === 'adicionar') {
      const id = slugifyId(interaction.options.getString('id'));
      const nome = interaction.options.getString('nome');
      const emoji = interaction.options.getString('emoji');
      const estilo = interaction.options.getString('estilo') ?? 'Secondary';
      const mensagem =
        interaction.options.getString('mensagem') ??
        'Descreva seu pedido com o máximo de detalhes possível.';

      if (!id) {
        return interaction.reply({
          content: 'ID inválido. Use apenas letras e números (ex: `comprar`).',
          ephemeral: true,
        });
      }

      let cats = [...getCategories(interaction.guildId)];
      if (cats.some((c) => c.id === id)) {
        return interaction.reply({
          content: `Já existe um botão com ID \`${id}\`. Remova antes ou use outro ID.`,
          ephemeral: true,
        });
      }

      if (cats.length >= 25) {
        return interaction.reply({
          content: 'Limite de 25 botões atingido (máximo do Discord).',
          ephemeral: true,
        });
      }

      const isDefaultOnly =
        !getGuildConfig(interaction.guildId).ticketCategories &&
        cats.length === DEFAULT_TICKET_CATEGORIES.length;

      if (isDefaultOnly) {
        cats = [...DEFAULT_TICKET_CATEGORIES];
      }

      cats.push({
        id,
        label: nome.slice(0, 80),
        emoji: emoji ?? undefined,
        style: styleFromName(estilo),
        welcomeTitle: `🎫 ${nome}`,
        welcomeMessage: mensagem,
      });

      setCategories(interaction.guildId, cats);
      return interaction.reply({
        content: `Botão **${nome}** (\`${id}\`) adicionado. Use \`/ticket painel\` para atualizar o painel.`,
        ephemeral: true,
      });
    }
  }

  if (!interaction.channel.topic?.includes('ticket-owner:')) {
    return interaction.reply({
      content: 'Este comando só funciona dentro de um canal de ticket.',
      ephemeral: true,
    });
  }

  if (sub === 'adicionar' || sub === 'remover') {
    const member = interaction.options.getUser('membro');
    const perm =
      sub === 'adicionar'
        ? { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }
        : null;

    await interaction.channel.permissionOverwrites.edit(member.id, perm);
    return interaction.reply({
      content:
        sub === 'adicionar'
          ? `${member} foi adicionado ao ticket.`
          : `${member} foi removido do ticket.`,
      ephemeral: true,
    });
  }

  if (sub === 'fechar') {
    const { closeTicket } = await import('../handlers/ticketHandler.js');
    return closeTicket(interaction, 'fechado via comando');
  }
}

export { ticketPanelEmbed, buildTicketPanelRows };
