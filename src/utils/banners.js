import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', '..', 'assets');

export const BANNER_FILES = {
  produtos: { path: join(ASSETS, 'banner-produtos.png'), name: 'banner-produtos.png' },
  suporte: { path: join(ASSETS, 'banner-suporte.png'), name: 'banner-suporte.png' },
  bemvindo: { path: join(ASSETS, 'banner-bemvindo.png'), name: 'banner-bemvindo.png' },
};

/** Banner do ticket conforme categoria */
export function getBannerKeyForCategory(categoryId) {
  if (categoryId === 'suporte') return 'suporte';
  return 'produtos';
}

export function getBannerAttachment(key) {
  const banner = BANNER_FILES[key];
  if (!banner || !existsSync(banner.path)) return null;
  return { attachment: banner.path, name: banner.name };
}

export function applyBannerToEmbed(embed, key) {
  const banner = BANNER_FILES[key];
  if (banner && existsSync(banner.path)) {
    embed.setImage(`attachment://${banner.name}`);
  }
  return embed;
}
