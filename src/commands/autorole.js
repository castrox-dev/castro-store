import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { getGuildConfig, setGuildConfig } from '../storage.js';

export const data = new SlashCommandBuilder()
  .setName('autorole')
  .setDescription('Cargo automático para novos membros')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((sub) =>
    sub
      .setName('definir')
      .setDescription('Define o cargo dado ao entrar no servidor')
      .addRoleOption((opt) =>
        opt.setName('cargo').setDescription('Cargo para novos membros').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('remover').setDescription('Desativa o cargo automático')
  )
  .addSubcommand((sub) =>
    sub.setName('ver').setDescription('Mostra o cargo automático atual')
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const config = getGuildConfig(interaction.guildId);

  if (sub === 'definir') {
    const role = interaction.options.getRole('cargo');

    if (role.managed) {
      return interaction.reply({
        content: 'Não é possível usar cargos gerenciados por integrações/bots.',
        ephemeral: true,
      });
    }

    const me = interaction.guild.members.me;
    if (role.position >= me.roles.highest.position) {
      return interaction.reply({
        content:
          'O cargo precisa ficar **abaixo** do cargo do bot na hierarquia do servidor.',
        ephemeral: true,
      });
    }

    setGuildConfig(interaction.guildId, { autoroleId: role.id });
    return interaction.reply({
      content: `Cargo automático definido: ${role}\nNovos membros receberão este cargo ao entrar.`,
      ephemeral: true,
    });
  }

  if (sub === 'remover') {
    setGuildConfig(interaction.guildId, { autoroleId: null });
    return interaction.reply({
      content: 'Cargo automático desativado.',
      ephemeral: true,
    });
  }

  const roleId = config.autoroleId;
  if (!roleId) {
    return interaction.reply({
      content: 'Nenhum cargo automático configurado. Use `/autorole definir`.',
      ephemeral: true,
    });
  }

  const role = interaction.guild.roles.cache.get(roleId);
  return interaction.reply({
    content: role
      ? `Cargo automático atual: ${role}`
      : 'O cargo configurado não existe mais. Configure novamente.',
    ephemeral: true,
  });
}
