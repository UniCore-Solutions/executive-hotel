import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({
  className,
  type,
  size = 'default',
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & { size?: 'default' | 'sm' }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-navy/15 bg-paper text-sm font-medium transition-colors',
        'w-full rounded-xl border px-3.5 py-3',
        size === 'sm' && 'px-3 py-2.5',
        'placeholder:text-navy/35 focus-visible:ring-gold/40 focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-clay aria-invalid:bg-clay/[0.04] aria-invalid:ring-clay/30',
        className
      )}
      {...props}
    />
  );
}

export { Input };
