import { apiFetch } from '@/app/lib/api-client';
import type {
  User,
  InvitePayload,
  InviteResponse,
  UpdateUserPayload,
} from './types';

export async function fetchUsers(): Promise<User[]> {
  return apiFetch<User[]>('/auth/users');
}

export async function inviteUser(payload: InvitePayload): Promise<InviteResponse> {
  return apiFetch<InviteResponse>('/auth/invite', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/auth/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
