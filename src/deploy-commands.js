import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { clientId, guildId, token } from './config.js';
import { commandDefinitions } from '../castro-license-service/src/bot/commands.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commands = [...commandDefinitions];
const commandsPath = join(__dirname, 'commands');

for (const file of readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = await import(pathToFileURL(join(commandsPath, file)).href);
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(token);

try {
  console.log(`Registrando ${commands.length} comandos...`);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`Comandos registrados no servidor ${guildId} (instantâneo).`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Comandos globais registrados (podem levar até 1h).');
  }
} catch (err) {
  console.error(err);
}
