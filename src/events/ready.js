import { ActivityType } from 'discord.js';

export const name = 'clientReady';
export const once = true;

export function execute(client) {
  console.log(`Bot online como ${client.user.tag}`);
  client.user.setActivity('CASTRO STORE | Premium Scripts ⚡', {
    type: ActivityType.Playing,
  });
}
