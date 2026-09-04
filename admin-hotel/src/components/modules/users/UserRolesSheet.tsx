'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, useConfirmDialog } from '@/components/shared/ConfirmDialog';
import { revokeRole } from '@/api/rest/endpoints/identity';
import { humanizeEnum } from '@/lib/format';
import { RoleBadge } from './RoleBadge';
import { AssignRoleForm } from './AssignRoleForm';
import type { AdminRolesQuery, AdminUsersQuery } from '@/graphql/generated/graphql';

type UserRow = AdminUsersQuery['adminUsers'][number];
type UserRoleRow = UserRow['roles'][number];

/**
 * Per-user role management, opened from a row click on the Users list.
 * Revoking is a real access-control action (this is not a cosmetic list
 * edit) — it always goes through `ConfirmDialog` first (§O), and the
 * backend's own last-super_admin guard (`IdentityAdminServiceImpl#revokeRole`)
 * still applies underneath: revoking the platform's only remaining
 * `super_admin` role 409s here exactly as it would from any other client.
 */
export function UserRolesSheet({
  user,
  roles,
  currentUserId,
  open,
  onOpenChange,
}: {
  user: UserRow | null;
  roles: AdminRolesQuery['adminRoles'];
  currentUserId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const apollo = useApollo();
  const { toast } = useToast();
  const confirm = useConfirmDialog();
  const [pendingRole, setPendingRole] = useState<UserRoleRow | null>(null);

  const revokeMutation = useMutation({
    mutationFn: (userRoleId: string) => revokeRole(userRoleId),
    onSuccess: () => {
      invalidateGraphql(apollo, 'users.revokeRole');
      toast({ title: 'Role revoked', variant: 'success' });
      confirm.hide();
      setPendingRole(null);
    },
    onError: (err: unknown) =>
      toast({
        title: 'Could not revoke role',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      }),
  });

  if (!user) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}</SheetTitle>
            <SheetDescription>{user.email}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-6">
            <div className="flex items-center gap-2">
              <StatusBadge domain="user" value={user.status} />
              {user.id === currentUserId ? <span className="text-xs text-muted-foreground">This is you</span> : null}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Roles</h3>
              {user.roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {user.roles.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <RoleBadge roleName={r.roleName} hotelName={r.hotelName} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-clay-dark hover:text-clay-dark"
                        onClick={() => {
                          setPendingRole(r);
                          confirm.show();
                        }}
                      >
                        Revoke
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Assign a role</h3>
              <AssignRoleForm userId={user.id} roles={roles} onAssigned={() => undefined} />
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(next) => {
          confirm.onOpenChange(next);
          if (!next) setPendingRole(null);
        }}
        title={
          pendingRole
            ? `Revoke ${humanizeEnum(pendingRole.roleName)}${pendingRole.hotelName ? ` at ${pendingRole.hotelName}` : ''}?`
            : 'Revoke role?'
        }
        description="This immediately removes the access this role grants. The user keeps any other roles they hold."
        confirmLabel="Revoke role"
        destructive
        loading={revokeMutation.isPending}
        onConfirm={() => {
          if (pendingRole) revokeMutation.mutate(pendingRole.id);
        }}
      />
    </>
  );
}
