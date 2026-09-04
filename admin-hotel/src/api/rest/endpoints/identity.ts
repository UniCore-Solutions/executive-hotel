import { restClient } from '../client';

/**
 * Staff identity write endpoints. Ground-truthed against
 * `AdminIdentityRestController` (backend-hotel): every method requires
 * `super_admin` internally (`CurrentUserAccessor.requireSuperAdmin()` in
 * `IdentityAdminServiceImpl`) — a non-super_admin gets a real 403, not a
 * silently-hidden action.
 *
 * The class carries `@RequestMapping("/api/v1/admin/users")` and the revoke
 * method is `@DeleteMapping("/roles/{userRoleId}")`, which together compose
 * to `/api/v1/admin/users/roles/{userRoleId}` — NOT
 * `/api/v1/admin/roles/{userRoleId}`. Verified live: the shorter path 404s,
 * this one 200s and returns the updated `AdminUserView`.
 */
export interface CreateUserInput {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  roleName: string;
  hotelId?: string;
}

export interface AssignRoleInput {
  roleName: string;
  hotelId?: string;
}

export async function createUser(input: CreateUserInput): Promise<unknown> {
  const { data } = await restClient.post('/admin/users', input);
  return data;
}

export async function assignRole(userId: string, input: AssignRoleInput): Promise<unknown> {
  const { data } = await restClient.post(`/admin/users/${userId}/roles`, input);
  return data;
}

export async function revokeRole(userRoleId: string): Promise<unknown> {
  const { data } = await restClient.delete(`/admin/users/roles/${userRoleId}`);
  return data;
}
