import { z } from 'zod';
import { HOTEL_CURRENCIES } from './settings';

export const platformBrandSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  tagline: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  defaultCurrency: z.enum(['MAD', 'EUR', 'GBP', 'USD', 'AED', 'SAR']),
  status: z.enum(['active', 'inactive', 'draft']),
});
export type PlatformBrandFormValues = z.infer<typeof platformBrandSchema>;

export const platformContactSchema = z.object({
  contactEmail: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  contactPhone: z.string().max(50).optional(),
});
export type PlatformContactFormValues = z.infer<typeof platformContactSchema>;

// Same hardcoded reference-currency list as the hotel Profile form (no
// `currencies` GraphQL query exists yet — NEW-5, docs/ADMIN_REBUILD_PROGRESS.md).
export const PLATFORM_CURRENCIES = HOTEL_CURRENCIES;
