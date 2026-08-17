import { cn } from '@/app/lib/utils';

interface AvatarProps {
  name?: string | null;
  src?: string;
  size?: 'sm' | 'md';
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';
  const sizeClasses = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9';

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary',
        sizeClasses,
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold">{initials}</span>
      )}
    </div>
  );
}
