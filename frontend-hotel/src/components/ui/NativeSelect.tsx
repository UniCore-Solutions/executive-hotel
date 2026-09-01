import * as React from 'react';
import { cn } from '@/lib/utils';

/** Native <select> wearing the same skin as Input — same border, radius,
    padding and focus/invalid treatment — with a chevron affordance drawn
    over it. Native is kept on purpose: the option sets here are short and
    the OS picker is the best mobile experience for them. */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'border-navy/15 bg-paper text-navy text-sm font-medium transition-colors',
          'w-full appearance-none rounded-xl border py-2.5 pr-9 pl-3',
          'hover:border-navy/25 focus-visible:ring-gold/40 focus-visible:ring-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-clay aria-invalid:bg-clay/[0.04] aria-invalid:ring-clay/30',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="text-navy/40 pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export { NativeSelect };
