export interface UserRole {
  role: { name: string };
}

export interface Profile {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  lastLogin: string | null;
  companyId: string | null;
  userRoles: UserRole[];
  menuConfig: string[];
}

export type AuthStatus = 'loading' | 'authed' | 'unauthed';
