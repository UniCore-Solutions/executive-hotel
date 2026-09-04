import { z } from 'zod';
import { STAFF_ROLES } from '@/lib/roles';

/**
 * Which roles require a `hotelId`, mirroring the backend's own source of
 * truth exactly: `IdentityAdminServiceImpl.HOTEL_SCOPED_ROLES =
 * CurrentUserAccessor.STAFF_ROLES` (backend-hotel). `lib/roles.ts` already
 * mirrors that same list for the nav/staff-gate convention, so this reuses
 * it rather than hand-rolling a second copy that could drift. `super_admin`
 * and `guest` are the two roles NOT in this list — both platform-level,
 * confirmed live via `adminRoles` (`hotelScoped: false` for both).
 */
const HOTEL_SCOPED_ROLES: readonly string[] = STAFF_ROLES;

export function isHotelScopedRole(roleName: string): boolean {
  return HOTEL_SCOPED_ROLES.includes(roleName);
}

/**
 * Mirrors `AdminCreateUserInput` (backend-hotel `dto/identity/`) and the
 * `IdentityAdminServiceImpl#validateRoleScope` rule: a hotel-scoped role
 * requires a hotel; a platform-level role forbids one (the backend 400s
 * either way — this just gives the same feedback before the round trip).
 */
export const createUserSchema = z
  .object({
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(6, 'At least 6 characters'),
    roleName: z.string().min(1, 'Select a role'),
    hotelId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const scoped = isHotelScopedRole(val.roleName);
    if (scoped && !val.hotelId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hotelId'],
        message: 'This role must be scoped to a hotel',
      });
    }
    if (!scoped && val.hotelId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hotelId'],
        message: 'This role is platform-level and cannot be scoped to a hotel',
      });
    }
  });
export type CreateUserFormValues = z.infer<typeof createUserSchema>;

/** Assigning an additional role to an existing user — same hotel-scope rule. */
export const assignRoleSchema = z
  .object({
    roleName: z.string().min(1, 'Select a role'),
    hotelId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const scoped = isHotelScopedRole(val.roleName);
    if (scoped && !val.hotelId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hotelId'],
        message: 'This role must be scoped to a hotel',
      });
    }
    if (!scoped && val.hotelId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hotelId'],
        message: 'This role is platform-level and cannot be scoped to a hotel',
      });
    }
  });
export type AssignRoleFormValues = z.infer<typeof assignRoleSchema>;
