import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { token } from './config.js';
import { bootstrapLicense } from './license/bootstrap.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
client.licenseHandlers = {};

const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(pathToFileURL(join(commandsPath, file)).href);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  }
}

const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = await import(pathToFileURL(join(eventsPath, file)).href);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

await bootstrapLicense(client);
client.login(token);
