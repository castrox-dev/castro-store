import { CUSTOM_IDS } from '../constants.js';
import { TICKET_OPEN_PREFIX } from '../utils/ticketCategories.js';
import { handleEmbedModal } from '../commands/embed.js';
import {
  openTicket,
  closeTicket,
  claimTicket,
} from '../handlers/ticketHandler.js';

export const name = 'interactionCreate';

export async function execute(interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const licenseHandler =
        interaction.client.licenseHandlers?.[interaction.commandName];
      if (licenseHandler) {
        await licenseHandler(interaction);
        return;
      }

      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === CUSTOM_IDS.embedModal) {
      await handleEmbedModal(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith(TICKET_OPEN_PREFIX)) {
        const categoryId = interaction.customId.slice(TICKET_OPEN_PREFIX.length);
        await openTicket(interaction, categoryId);
        return;
      }
      if (interaction.customId === CUSTOM_IDS.ticketClose) {
        await closeTicket(interaction);
        return;
      }
      if (interaction.customId === CUSTOM_IDS.ticketClaim) {
        await claimTicket(interaction);
        return;
      }
    }
  } catch (err) {
    console.error('Erro na interação:', err);
    const payload = {
      content: 'Ocorreu um erro ao processar. Tente novamente.',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
}
