import Image from 'next/image';
import { cn } from '@/app/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 24, text: 'text-sm' },
  md: { box: 32, text: 'text-base' },
  lg: { box: 48, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/icons/logo.svg"
        alt="OperoERP"
        width={s.box}
        height={s.box}
        className="shrink-0"
      />
      {showText && (
        <span className={cn('font-bold tracking-tight text-foreground', s.text)}>
          Opero<span className="text-primary">ERP</span>
        </span>
      )}
    </div>
  );
}
