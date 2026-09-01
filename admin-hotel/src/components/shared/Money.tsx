import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

/** The single money formatter in the app (§O) — always MAD, tabular
    numerals, right-aligned by default since it is almost always a table
    or summary column. */
export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('font-variant-numeric tabular-nums', className)}>{formatMoney(amount)}</span>;
}
