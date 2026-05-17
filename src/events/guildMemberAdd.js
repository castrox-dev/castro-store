import { getGuildConfig } from '../storage.js';
import { welcomeChannelId } from '../config.js';
import { getWelcomePayload } from '../utils/welcome.js';

export const name = 'guildMemberAdd';

async function applyAutorole(member) {
  const config = getGuildConfig(member.guild.id);
  if (!config.autoroleId) return;

  const role = member.guild.roles.cache.get(config.autoroleId);
  if (!role) return;

  try {
    await member.roles.add(role, 'Cargo automático ao entrar');
  } catch (err) {
    console.warn(
      `[autorole] Não foi possível dar cargo em ${member.guild.name}:`,
      err.message
    );
  }
}

async function sendWelcome(member) {
  if (!welcomeChannelId) return;

  const channel = await member.guild.channels
    .fetch(welcomeChannelId)
    .catch(() => null);

  if (!channel?.isTextBased()) {
    console.warn(`[welcome] Canal ${welcomeChannelId} não encontrado ou inválido.`);
    return;
  }

  try {
    await channel.send(getWelcomePayload(member));
  } catch (err) {
    console.warn(`[welcome] Erro ao enviar mensagem:`, err.message);
  }
}

export async function execute(member) {
  if (member.user.bot) return;

  await Promise.all([applyAutorole(member), sendWelcome(member)]);
}
