import { z } from 'zod';

export const roomTypeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().max(2000).optional(),
  maxAdults: z.number().int().min(1, 'At least 1 adult').max(20),
  maxChildren: z.number().int().min(0).max(20),
  bedConfiguration: z.string().max(150).optional(),
  sizeSqm: z.number().positive().optional(),
  viewType: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'draft']),
});
export type RoomTypeFormValues = z.infer<typeof roomTypeSchema>;

export const roomSchema = z.object({
  roomTypeId: z.string().min(1, 'Room type is required'),
  roomNumber: z.string().min(1, 'Room number is required').max(20),
  floor: z.string().max(20).optional(),
  status: z.enum(['active', 'inactive', 'out_of_order']),
  housekeepingStatus: z.enum(['clean', 'dirty', 'inspected', 'out_of_service']),
  maintenanceStatus: z.enum(['ok', 'needs_repair', 'under_repair']),
});
export type RoomFormValues = z.infer<typeof roomSchema>;
