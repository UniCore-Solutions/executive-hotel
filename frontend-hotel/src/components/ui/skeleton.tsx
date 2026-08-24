import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-navy/5 animate-pulse rounded-2xl', className)}
      {...props}
    />
  );
}

export { Skeleton };
