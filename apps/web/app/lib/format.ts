export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function formatCurrency(value: string | null): string {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

export function decimalPrefill(value: string | null | undefined): string {
  if (value == null) return '';
  const n = Number(value);
  return Number.isNaN(n) ? '' : String(n);
}

export function formatSignedNumber(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (n > 0) return `+${n}`;
  return String(n);
}

export function formatFullName(
  user?: { firstName?: string | null; lastName?: string | null } | null,
  fallback: string = '—',
): string {
  if (!user) return fallback;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
}
