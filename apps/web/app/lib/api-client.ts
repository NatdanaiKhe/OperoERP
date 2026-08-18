import { useAuthStore } from '@/app/features/auth/store';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;
if (!baseUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not set');
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options ?? {};
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (fetchOptions.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const rawMessage = data?.message ?? 'Request failed';
    const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage;
    throw new ApiError(message, res.status);
  }

  return data as T;
}
