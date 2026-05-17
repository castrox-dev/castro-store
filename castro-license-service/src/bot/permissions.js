import { config } from '../config.js';

export function isStaff(member) {
  if (!member) return false;
  if (member.permissions?.has('Administrator')) return true;
  return config.roles.staff.some((roleId) => member.roles.cache.has(roleId));
}

export function canGenerate(member) {
  if (isStaff(member)) return { allowed: true, staff: true };
  const hasBuyer = config.roles.buyer.some((roleId) => member.roles.cache.has(roleId));
  if (hasBuyer) return { allowed: true, staff: false };
  if (config.roles.buyer.length === 0 && config.roles.staff.length === 0) {
    return { allowed: true, staff: false, openMode: true };
  }
  return { allowed: false, staff: false };
}

export function canRevoke(member) {
  return isStaff(member);
}
