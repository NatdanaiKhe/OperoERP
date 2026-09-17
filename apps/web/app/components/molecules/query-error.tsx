import { cn } from '@/app/lib/utils';
import { FormAlert } from '@/app/components/molecules/form-alert';
import { Button } from '@/app/components/atoms/button';

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

export function QueryError({
  message = 'Failed to load. Please try again.',
  onRetry,
  retrying = false,
  className,
}: QueryErrorProps) {
  return (
    <FormAlert className={cn('flex items-center justify-between', className)}>
      {message}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
        >
          Retry
        </Button>
      )}
    </FormAlert>
  );
}
