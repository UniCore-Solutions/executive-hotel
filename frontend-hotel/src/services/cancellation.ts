/** Cancellation evaluation (RES-3) — port of RC.cancellation (mock.js). */
import { DATA } from '@/data';
import type { CancellationEvaluation, Reservation } from '@/types';
import { addDays, fromISODate, startOfDay, toISODate } from '@/lib/dates';
import { fmtMad } from '@/lib/format';
import type { CurrencyCode } from '@/types';

export function evaluate(
  reservation: Reservation,
  currency: CurrencyCode = 'MAD',
  today: Date = startOfDay(new Date())
): CancellationEvaluation {
  const planId = String(reservation.planId || '');
  const suffix = planId.split('::')[1] || 'bb';
  const store = DATA.PROPERTY.rooms.find((r) => r.id === reservation.roomId);
  const perNight =
    (reservation.price && reservation.price.perNight) || (store ? store.pricePerNight : 0);
  const total = reservation.price?.total ?? 0;

  if (suffix === 'ro') {
    return {
      fee: total,
      refund: 0,
      label: `Non-refundable — the full stay of ${fmtMad(total, currency)} is charged.`,
      freeUntilIso: '',
    };
  }
  const policy = (store && store.cancellationPolicy) || '';
  const m = /(\d+) days/.exec(policy);
  const days = m ? parseInt(m[1] ?? '0', 10) : 1;
  const checkin = fromISODate(reservation.checkin);
  const daysToArrival = checkin
    ? Math.ceil((checkin.getTime() - startOfDay(today).getTime()) / 86400000)
    : 0;
  const freeUntilIso = checkin ? toISODate(addDays(checkin, -days)) : '';
  if (daysToArrival > days)
    return { fee: 0, refund: total, label: 'Free cancellation', freeUntilIso };
  const fee = Math.round(perNight);
  return { fee, refund: Math.max(0, total - fee), label: 'One night charged', freeUntilIso };
}
