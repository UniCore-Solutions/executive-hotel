import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold uppercase tracking-widest transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-navy text-white shadow-lg shadow-navy/15 hover:bg-navy-light',
        outline: 'border border-navy/15 bg-white text-navy hover:border-navy/30 hover:bg-paper',
        ghost: 'font-semibold normal-case tracking-normal text-navy/60 hover:text-navy',
        gold: 'bg-gold text-navy-dark hover:bg-gold-light',
        onDark:
          'border border-white/25 bg-transparent font-semibold normal-case tracking-normal text-white/85 hover:bg-white/10',
        destructive: 'bg-clay text-white hover:bg-clay-light',
        navyLink: 'text-gold-light hover:text-white',
      },
      size: {
        default: 'px-6 py-3',
        sm: 'px-5 py-2.5',
        lg: 'px-7 py-3.5',
        xl: 'px-8 py-3.5',
        icon: 'size-9',
        iconSm: 'size-7',
        iconLg: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
