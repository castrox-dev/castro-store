import { EmbedBuilder } from 'discord.js';
import { COLORS } from '../constants.js';
import { applyBannerToEmbed, getBannerAttachment } from './banners.js';

export function buildWelcomeEmbed(member) {
  const embed = new EmbedBuilder()
    .setTitle('Bem-vindo à CASTRO STORE! ⚡')
    .setDescription(
      `Olá ${member}, é um prazer ter você aqui!\n\n` +
        '**Premium FiveM Scripts** — otimizados, seguros e alta performance.\n\n' +
        '• Confira os canais de **produtos**\n' +
        '• Dúvidas? Abra um **ticket** no painel de suporte\n' +
        '• Leia as regras e aproveite o servidor\n\n' +
        `Você é nosso **${member.guild.memberCount}º** membro!`
    )
    .setColor(COLORS.primary)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: 'CASTRO STORE • Premium FiveM Scripts ⚡' })
    .setTimestamp();

  return applyBannerToEmbed(embed, 'bemvindo');
}

export function getWelcomePayload(member) {
  const embed = buildWelcomeEmbed(member);
  const bannerFile = getBannerAttachment('bemvindo');
  const payload = {
    embeds: [embed],
    allowedMentions: { users: [member.id] },
  };
  if (bannerFile) payload.files = [bannerFile];
  return payload;
}
