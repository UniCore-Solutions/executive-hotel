import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-clay/20 bg-clay/5 py-16 text-center">
      <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-clay/10 text-clay-dark">
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-clay-dark">Couldn&apos;t load this</p>
      <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
