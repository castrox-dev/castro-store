import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Apaga mensagens do canal')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addIntegerOption((opt) =>
    opt
      .setName('quantidade')
      .setDescription('Quantas mensagens apagar (1 a 100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption((opt) =>
    opt.setName('membro').setDescription('Apagar só mensagens deste membro')
  );

export async function execute(interaction) {
  const quantidade = interaction.options.getInteger('quantidade');
  const membro = interaction.options.getUser('membro');

  if (!interaction.channel.isTextBased()) {
    return interaction.reply({
      content: 'Este comando só funciona em canais de texto.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    let deleted;

    if (membro) {
      const fetched = await interaction.channel.messages.fetch({ limit: 100 });
      const alvo = fetched
        .filter((m) => m.author.id === membro.id)
        .first(quantidade);

      if (!alvo.size) {
        return interaction.editReply({
          content: `Nenhuma mensagem recente de ${membro} para apagar.`,
        });
      }

      deleted = await interaction.channel.bulkDelete(alvo, true);
    } else {
      deleted = await interaction.channel.bulkDelete(quantidade, true);
    }

    const qtd = deleted.size;
    const textoMembro = membro ? ` de ${membro}` : '';

    await interaction.editReply({
      content:
        qtd > 0
          ? `🗑️ **${qtd}** mensagem(ns)${textoMembro} apagada(s).`
          : 'Nenhuma mensagem apagada. Mensagens com mais de 14 dias não podem ser removidas em massa.',
    });
  } catch (err) {
    console.error('[clear]', err);
    await interaction.editReply({
      content:
        'Não foi possível apagar. Verifique se o bot tem **Gerenciar Mensagens** e se as mensagens têm menos de 14 dias.',
    });
  }
}
