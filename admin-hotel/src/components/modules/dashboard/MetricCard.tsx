import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Dashboard KPI tile. `footnote` is mandatory on any derived metric (§O,
    §Q-4) — a number without context is worse than no number. */
export function MetricCard({
  icon: Icon,
  label,
  value,
  footnote,
  tone = 'default',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  footnote?: string;
  tone?: 'default' | 'gold' | 'success' | 'info';
}) {
  const toneClass = {
    default: 'border-t-navy',
    gold: 'border-t-gold',
    success: 'border-t-success',
    info: 'border-t-info',
  }[tone];

  return (
    <div className={cn('rounded-xl border border-border border-t-[3px] bg-card p-4 shadow-sm', toneClass)}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="font-display text-2xl font-semibold text-ink tabular-nums">{value}</p>
      {footnote ? <p className="mt-1.5 text-[11px] text-muted-foreground">{footnote}</p> : null}
    </div>
  );
}
