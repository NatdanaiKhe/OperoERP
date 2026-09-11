'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from './store';
import { login, logout, refresh, fetchProfile, updateProfile } from './api';
import { AuthStatus } from './types';

export const PROFILE_KEY = ['auth', 'profile'] as const;
const REFRESH_KEY = ['auth', 'refresh'] as const;

export function useAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  return { accessToken, user };
}

export function useRefreshAuth() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: REFRESH_KEY,
    queryFn: async () => {
      const { accessToken: newToken } = await refresh();
      useAuthStore.getState().setAccessToken(newToken);
      return { accessToken: newToken };
    },
    enabled: !accessToken,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useProfile() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: fetchProfile,
    enabled: !!accessToken,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
    },
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
      qc.removeQueries({ queryKey: REFRESH_KEY });
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
      qc.removeQueries({ queryKey: REFRESH_KEY });
      router.push('/login');
    },
    onError: () => {
      useAuthStore.getState().clear();
      qc.removeQueries({ queryKey: PROFILE_KEY });
      qc.removeQueries({ queryKey: REFRESH_KEY });
      router.push('/login');
    },
  });
}

export function useCanAccess(menu: string) {
  const { data: profile, isLoading } = useProfile();

  const canAccess = profile?.menuConfig?.includes(menu) ?? false;

  return {
    canAccess,
    isLoading,
  };
}

export function useRequireAuth(): AuthStatus {
  const { accessToken } = useAuth();
  const { isFetching } = useRefreshAuth();

  if (accessToken) return 'authed';
  if (isFetching) return 'loading';
  return 'unauthed';
}
