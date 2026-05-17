import { PermissionFlagsBits } from 'discord.js';

export function isStaff(member, staffRoleId) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (staffRoleId && member.roles.cache.has(staffRoleId)) return true;
  return false;
}
