/** Static content: search widget domain options (limits + segments). */

export const GUEST_LIMITS = {
  adults: [1, 9] as const,
  children: [0, 6] as const,
  rooms: [1, 5] as const,
};

export type GuestField = keyof typeof GUEST_LIMITS;

export const SEARCH_SEGMENTS = ['dates', 'guests', 'promo'] as const;
export type SearchSegment = (typeof SEARCH_SEGMENTS)[number];
