import { z } from 'zod';

/**
 * Curated categories, matching the real values seeded across every hotel
 * today (`V11__seed_amenity_catalog.sql`: 28 amenities, exactly these 4
 * category values, zero others). Kept as a whitelist here — shared between
 * this create/edit form and anywhere else that groups amenities by category
 * — rather than a free-text field, so a typo doesn't silently create a new,
 * orphaned category no picker groups correctly.
 */
export const AMENITY_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'business', label: 'Business' },
  { value: 'room', label: 'Room' },
] as const;

export const amenitySchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
  isActive: z.boolean(),
});
export type AmenityFormValues = z.infer<typeof amenitySchema>;
