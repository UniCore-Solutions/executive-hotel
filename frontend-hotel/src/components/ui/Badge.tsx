/** Badge primitives */
import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'available' | 'few' | 'soldout' | 'plan' | 'promo' | 'gold' | 'navy';
  /** Filled treatment for badges laid over a photo, where the default tinted
      background washes out against a bright image. Inline chips in running
      text keep the tinted default — `soldout` also styles "Non-refundable"
      and the policy chips, which must not shout. */
  solid?: boolean;
}

export function Badge({
  children,
  variant = 'available',
  solid = false,
  className = '',
  ...props
}: BadgeProps) {
  const variants = {
    available: 'bg-emerald-700/10 text-emerald-800 border-emerald-700/20',
    few: 'bg-gold/10 text-gold-dark border-gold/20',
    soldout: 'bg-clay/10 text-clay-dark border-clay/30',
    plan: 'bg-navy/10 text-navy border-navy/20',
    promo: 'bg-gold/10 text-gold-dark border-gold/20',
    gold: 'bg-gold/10 text-gold-dark border-gold/20',
    navy: 'bg-navy/10 text-navy border-navy/20',
  };
  const solidVariants = {
    available: 'bg-emerald-700 border-emerald-700 text-white',
    few: 'bg-gold-dark border-gold-dark text-white',
    soldout: 'bg-clay-dark border-clay-dark text-white',
    plan: 'bg-navy border-navy text-white',
    promo: 'bg-gold-dark border-gold-dark text-white',
    gold: 'bg-gold-dark border-gold-dark text-white',
    navy: 'bg-navy border-navy text-white',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase ${
        solid ? `${solidVariants[variant]} shadow-sm` : variants[variant]
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export function PlanBadge({ freeCancellation }: { freeCancellation: boolean }) {
  return freeCancellation ? (
    <Badge variant="plan">Free cancellation</Badge>
  ) : (
    <Badge variant="soldout">Non-refundable</Badge>
  );
}

export function PolicyChip({ policy }: { policy: string }) {
  if (policy.startsWith('Free cancellation')) {
    const until = policy.match(/up to (\d+) days?/i);
    return (
      <Badge variant="plan">
        {until ? `Free cancellation until ${until[1]} days before arrival` : policy}
      </Badge>
    );
  }
  return <Badge variant="soldout">{policy}</Badge>;
}
