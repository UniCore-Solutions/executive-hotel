/** Static content: booking / reservation domain options shared across flows. */

export const TITLES = ['Mr', 'Ms', 'Mrs', 'Mx', 'Dr'] as const;
export type Title = (typeof TITLES)[number];

/** Arrival windows offered on the booking form (display copy; persisted
    verbatim on the reservation as arrival_slot). */
export const ARRIVAL_SLOTS = ['15:00 – 18:00', '18:00 – 21:00', '21:00 – 23:00', 'After 23:00'];

/** Demo booking hold window (pay step). */
export const HOLDS_SECONDS = 15 * 60;

export type ReservationStatusKey = 'confirmed' | 'checked-in' | 'cancelled';

export const STATUS_INFO: Record<ReservationStatusKey, { banner: string; pill: string }> = {
  confirmed: {
    banner: 'Confirmed — your stay is locked in. We look forward to welcoming you.',
    pill: 'bg-navy/8 text-navy',
  },
  'checked-in': {
    banner: 'Checked in — welcome to the hotel! Your room is ready from 15:00.',
    pill: 'bg-emerald-700/10 text-emerald-700',
  },
  cancelled: {
    banner: 'Cancelled — this reservation is no longer active.',
    pill: 'bg-clay/10 text-clay',
  },
};
