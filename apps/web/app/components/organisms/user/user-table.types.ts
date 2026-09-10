import type { User } from '@/app/features/users/types';

export interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onEdit?: (user: User) => void;
}
