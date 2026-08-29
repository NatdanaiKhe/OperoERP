const SUPERADMIN_ROLE = 'superadmin';

export function isSuperAdmin(roles: string[]): boolean {
  return roles.includes(SUPERADMIN_ROLE);
}
