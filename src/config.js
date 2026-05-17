import 'dotenv/config';

export const token = process.env.DISCORD_TOKEN;
export const clientId = process.env.CLIENT_ID;
export const guildId = process.env.GUILD_ID;
export const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;

if (!token || !clientId) {
  console.error('Defina DISCORD_TOKEN e CLIENT_ID no arquivo .env');
  process.exit(1);
}
