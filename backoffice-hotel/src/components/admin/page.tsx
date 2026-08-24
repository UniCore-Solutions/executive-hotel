import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = status.includes('cancel') || status === 'failed' || status === 'rejected'
    ? 'soldout'
    : status === 'checked_in' || status === 'active' || status === 'approved' || status === 'authorized'
      ? 'available'
      : status === 'pending'
        ? 'few'
        : 'plan';
  return (
    <Badge variant={variant} className={className}>
      {status.replaceAll('_', ' ')}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-3')}>
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}