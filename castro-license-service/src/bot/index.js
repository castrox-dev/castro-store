import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from '../config.js';
import { createCommandHandlers } from './commands.js';

export async function startDiscordBot(licenseService, repo) {
  const handlers = createCommandHandlers(licenseService, repo);

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`[bot] Ligado como ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const handler = handlers[interaction.commandName];
    if (!handler) return;

    try {
      await handler(interaction);
    } catch (err) {
      console.error(`[bot] Erro em /${interaction.commandName}:`, err);
      const msg = { content: 'Erro interno. Contacta o staff.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  });

  await client.login(config.discord.token);
  return client;
}
