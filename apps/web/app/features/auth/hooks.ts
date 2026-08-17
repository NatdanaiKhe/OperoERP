'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './store';
import { login, logout, fetchProfile } from './api';

export const PROFILE_KEY = ['auth', 'profile'] as const;

export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return { accessToken, user };
}

export function useProfile() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: fetchProfile,
    enabled: !!accessToken,
  });
}

export function useLogin() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: ({ accessToken }) => {
      useAuthStore.getState().setAccessToken(accessToken);
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      router.push('/dashboard');
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      useAuthStore.getState().clear();
      qc.removeQueries({ queryKey: PROFILE_KEY });
      router.push('/login');
    },
    onError: () => {
      useAuthStore.getState().clear();
      qc.removeQueries({ queryKey: PROFILE_KEY });
      router.push('/login');
    },
  });
}
