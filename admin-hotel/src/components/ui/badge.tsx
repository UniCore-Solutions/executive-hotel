import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-muted text-muted-foreground',
        success: 'border-success/25 bg-success-light text-success-dark',
        info: 'border-info/25 bg-info-light text-info-dark',
        warn: 'border-warn/25 bg-warn-light text-warn-dark',
        critical: 'border-clay/25 bg-clay/10 text-clay-dark',
        gold: 'border-gold/30 bg-gold/10 text-gold-dark',
        navy: 'border-navy/20 bg-navy/8 text-navy',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

function Badge({
  className,
  variant,
  dot = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {props.children}
    </span>
  );
}

export { Badge, badgeVariants };
