import { z } from 'zod';

export const hotelProfileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  brand: z.string().max(150).optional(),
  description: z.string().max(2000).optional(),
  hotelType: z.string().max(100).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  countryCode: z
    .union([z.string().regex(/^[A-Za-z]{2}$/, 'Use a 2-letter country code'), z.literal('')])
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().max(50).optional(),
  email: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  website: z.union([z.string().url('Invalid URL'), z.literal('')]).optional(),
  timezone: z.string().max(64).optional(),
  languages: z.array(z.string()).max(30).optional(),
  starRating: z.number().int().min(1).max(5).optional(),
  checkInTime: z
    .union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm'), z.literal('')])
    .optional(),
  checkOutTime: z
    .union([z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm'), z.literal('')])
    .optional(),
  defaultCurrency: z.enum(['MAD', 'EUR', 'GBP', 'USD', 'AED', 'SAR']),
  status: z.enum(['active', 'inactive', 'draft']),
});
export type HotelProfileFormValues = z.infer<typeof hotelProfileSchema>;

/**
 * There is no GraphQL query to list reference currencies (`currencies` table,
 * 6 rows — verified live 2026-09-01), unlike `countries`. Hardcoded here as a
 * discovered backend gap (docs/ADMIN_REBUILD_PROGRESS.md, NEW-5) — same
 * pattern as `CANCELLATION_REASONS` in schemas/reservations.ts.
 */
export const HOTEL_CURRENCIES = [
  { value: 'MAD', label: 'MAD — Moroccan Dirham' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
] as const;

/**
 * There is no GraphQL query to list reference languages either (same gap as
 * `HOTEL_CURRENCIES` above — no `languages` table/query exists). ISO 639-1
 * codes, a common-language subset rather than the full ~180-code standard —
 * matches the option-count `MultiSelectField` is designed for (a scannable
 * checkbox grid, not a searchable list of hundreds).
 */
export const HOTEL_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ru', label: 'Russian' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'tr', label: 'Turkish' },
] as const;

export const hotelPoliciesSchema = z.object({
  policies: z
    .array(
      z.object({
        name: z.string().min(1, 'Required').max(150),
        value: z.string().min(1, 'Required').max(2000),
        icon: z.string().max(100).optional(),
      }),
    )
    .max(50),
});
export type HotelPoliciesFormValues = z.infer<typeof hotelPoliciesSchema>;
