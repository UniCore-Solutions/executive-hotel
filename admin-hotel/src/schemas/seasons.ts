import { z } from 'zod';

/** Matches the backend's `chk_seasons_type` CHECK constraint
    (`SeasonServiceImpl.SEASON_TYPES`, V42__seasons.sql) exactly. */
export const SEASON_TYPES = [
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'custom', label: 'Custom' },
] as const;

export const seasonSchema = z
  .object({
    name: z.string().min(2, 'Name is required').max(100),
    seasonType: z.string(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isActive: z.boolean(),
    color: z.string().max(20).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
export type SeasonFormValues = z.infer<typeof seasonSchema>;
