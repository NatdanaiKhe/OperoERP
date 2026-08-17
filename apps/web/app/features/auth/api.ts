import { apiFetch } from '@/app/lib/api-client';
import type { Profile } from './types';

export interface LoginResponse {
  accessToken: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST', skipAuth: true });
}

export async function refresh(): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/refresh', {
    method: 'POST',
    skipAuth: true,
  });
}

export async function fetchProfile(): Promise<Profile> {
  return apiFetch<Profile>('/auth/profile');
}
