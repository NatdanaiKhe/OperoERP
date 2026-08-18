import { apiFetch } from '@/app/lib/api-client';
import type { User, InvitePayload, InviteResponse } from './types';

export async function fetchUsers(): Promise<User[]> {
  return apiFetch<User[]>('/auth/users');
}

export async function inviteUser(payload: InvitePayload): Promise<InviteResponse> {
  return apiFetch<InviteResponse>('/auth/invite', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
