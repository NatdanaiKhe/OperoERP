import { useAuthStore } from '@/app/features/auth/store';

const baseUrl = process.env.NEXT_PUBLIC_API_URL;
if (!baseUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is not set');
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function apiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong.',
) {
  return err instanceof ApiError ? err.message : fallback;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          useAuthStore.getState().clear();
          return null;
        }
        const data = await res.json();
        const token: string = data.accessToken;
        useAuthStore.getState().setAccessToken(token);
        return token;
      } catch {
        useAuthStore.getState().clear();
        return null;
      } finally {
        refreshPromise = null; // reset so the next 401 wave can trigger a fresh refresh
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options ?? {};

  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string>),
    };
    if (fetchOptions.body) headers['Content-Type'] = 'application/json';
    if (!skipAuth) {
      const token = useAuthStore.getState().accessToken;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const doFetch = () =>
    fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers: buildHeaders(),
      credentials: 'include',
    });

  let res = await doFetch();

  // Only attempt refresh-and-retry for authenticated requests that failed auth,
  // and never for the refresh/login/logout endpoints themselves.
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(); // retry exactly once with the new token
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const rawMessage = data?.message ?? 'Request failed';
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('; ')
      : rawMessage;
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}
