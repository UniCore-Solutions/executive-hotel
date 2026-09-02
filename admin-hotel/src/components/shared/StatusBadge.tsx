import { Badge, badgeVariants } from '@/components/ui/badge';
import { humanizeEnum } from '@/lib/format';
import type { VariantProps } from 'class-variance-authority';

type Tone = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/**
 * Single mapping from every backend status enum to a semantic tone — the
 * one place a status is colored (§O). Do not re-derive status colors
 * inline elsewhere.
 */
const RESERVATION_STATUS: Record<string, Tone> = {
  pending: 'info',
  confirmed: 'success',
  modified: 'warn',
  cancelled: 'critical',
  checked_in: 'success',
  checked_out: 'neutral',
  no_show: 'critical',
};

const PAYMENT_STATUS: Record<string, Tone> = {
  pending: 'info',
  authorized: 'info',
  captured: 'success',
  failed: 'critical',
  refunded: 'neutral',
  partially_refunded: 'warn',
  // Not real backend enum values — synthesized display-only states from
  // lib/reservationStatus.ts#paymentStatusDisplay, which disambiguates a
  // bare 'pending' (see that file for why one raw status can mean three
  // very different things to a guest).
  due_at_property: 'info',
  not_charged: 'neutral',
};

const ROOM_STATUS: Record<string, Tone> = {
  active: 'success',
  inactive: 'neutral',
  out_of_order: 'critical',
};

const HOUSEKEEPING_STATUS: Record<string, Tone> = {
  clean: 'success',
  inspected: 'info',
  dirty: 'warn',
  out_of_service: 'critical',
};

const MAINTENANCE_STATUS: Record<string, Tone> = {
  ok: 'success',
  needs_repair: 'warn',
  under_repair: 'critical',
};

const CATALOG_STATUS: Record<string, Tone> = {
  active: 'success',
  draft: 'warn',
  inactive: 'neutral',
};

const AVAILABILITY_STATUS: Record<string, Tone> = {
  available: 'success',
  few: 'warn',
  soldout: 'critical',
};

const REVIEW_STATUS: Record<string, Tone> = {
  pending: 'info',
  published: 'success',
  rejected: 'critical',
};

const DOMAINS = {
  reservation: RESERVATION_STATUS,
  payment: PAYMENT_STATUS,
  room: ROOM_STATUS,
  housekeeping: HOUSEKEEPING_STATUS,
  maintenance: MAINTENANCE_STATUS,
  catalog: CATALOG_STATUS,
  availability: AVAILABILITY_STATUS,
  review: REVIEW_STATUS,
} as const;

export type StatusDomain = keyof typeof DOMAINS;

export function StatusBadge({
  domain,
  value,
  label,
}: {
  domain: StatusDomain;
  value: string;
  label?: string;
}) {
  const tone = DOMAINS[domain][value.toLowerCase()] ?? 'neutral';
  return (
    <Badge variant={tone} dot>
      {label ?? humanizeEnum(value)}
    </Badge>
  );
}
