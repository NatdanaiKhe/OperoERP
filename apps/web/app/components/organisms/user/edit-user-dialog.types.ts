import type { User } from '@/app/features/users/types';

export interface EditUserDialogProps {
  user: User | null;
  onClose: () => void;
}
