import { REST, Routes } from 'discord.js';
import { config, assertConfig } from '../config.js';
import { commandDefinitions } from './commands.js';

assertConfig();

const rest = new REST({ version: '10' }).setToken(config.discord.token);

async function main() {
  if (config.discord.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandDefinitions }
    );
    console.log(`[commands] Registados no servidor ${config.discord.guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(config.discord.clientId), {
      body: commandDefinitions,
    });
    console.log('[commands] Registados globalmente (pode demorar até 1h)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
