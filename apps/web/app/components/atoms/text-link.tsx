import Link from 'next/link';
import { cn } from '@/app/lib/utils';

interface TextLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function TextLink({ href, children, className }: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn('text-sm font-medium text-primary-container hover:underline', className)}
    >
      {children}
    </Link>
  );
}
