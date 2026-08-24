'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ShieldPlus, Trash2, UserPlus } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import {
  AdminHotelsDocument,
  AdminRolesDocument,
  AdminUsersDocument,
  AssignRoleDocument,
  CreateUserDocument,
  RevokeRoleDocument,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader, StatusBadge } from '@/components/admin/page';
import { Form, FormError, MutationError } from '@/components/admin/forms';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [roleFor, setRoleFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => proxyRequest(AdminUsersDocument, {}),
  });
  const rolesQuery = useQuery({
    queryKey: ['adminRoles'],
    queryFn: () => proxyRequest(AdminRolesDocument, {}),
  });
  const hotelsQuery = useQuery({
    queryKey: ['adminHotels'],
    queryFn: () => proxyRequest(AdminHotelsDocument, { page: { page: 0, size: 100 } }),
  });

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleName: 'reception_staff',
    hotelId: '',
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
  };

  const createUser = useMutation({
    mutationFn: () =>
      proxyRequest(CreateUserDocument, {
        input: {
          firstName: form.firstName || undefined,
          lastName: form.lastName || undefined,
          email: form.email,
          password: form.password,
          roleName: form.roleName,
          hotelId: form.hotelId || undefined,
        },
      }),
    onSuccess: () => {
      setCreateOpen(false);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create user.'),
  });

  const assignRole = useMutation({
    mutationFn: (args: { userId: string; roleName: string; hotelId?: string }) =>
      proxyRequest(AssignRoleDocument, args),
    onSuccess: () => {
      setRoleFor(null);
      invalidate();
    },
  });

  const revokeRole = useMutation({
    mutationFn: (userRoleId: string) => proxyRequest(RevokeRoleDocument, { userRoleId }),
    onSuccess: invalidate,
  });

  if (usersQuery.isLoading || rolesQuery.isLoading) {
    return <Skeleton className="h-72 w-full" />;
  }

  const users = usersQuery.data?.adminUsers ?? [];
  const roles = rolesQuery.data?.adminRoles ?? [];
  const hotels = hotelsQuery.data?.adminHotels.items ?? [];

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Platform staff accounts (super admin only)"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="mr-1" aria-hidden="true" /> New user
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Staff accounts</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.firstName} {u.lastName}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((role) => (
                        <span
                          key={role.id}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {role.roleName}
                          {role.hotelName ? ` · ${role.hotelName}` : ''}
                          <button
                            aria-label={`Revoke ${role.roleName}`}
                            onClick={() => revokeRole.mutate(role.id)}
                            className="text-clay-dark hover:text-clay"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                      <button
                        aria-label={`Add role to ${u.email}`}
                        onClick={() => setRoleFor(u.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-navy/30 px-2 py-0.5 text-[10px] text-navy hover:border-navy"
                      >
                        <ShieldPlus className="h-3 w-3" aria-hidden="true" /> Add role
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    Since {formatDateTime(u.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Available roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <span
                key={role.name}
                className="rounded-full border border-border bg-paper px-3 py-1 text-xs text-muted-foreground"
              >
                {role.name}
                {role.hotelScoped ? ' · hotel-scoped' : ' · platform-wide'}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New staff user</DialogTitle>
          </DialogHeader>
          <Form
            onSubmit={async () => {
              setError(null);
              await createUser.mutateAsync();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="u-first">First name</Label>
                <Input id="u-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-last">Last name</Label>
                <Input id="u-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="u-email">Email *</Label>
                <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="u-password">Password *</Label>
                <Input id="u-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-role">Role</Label>
                <select
                  id="u-role"
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={form.roleName}
                  onChange={(e) => setForm({ ...form, roleName: e.target.value })}
                >
                  {roles.map((role) => (
                    <option key={role.name} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-hotel">Hotel (for hotel-scoped roles)</Label>
                <select
                  id="u-hotel"
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={form.hotelId}
                  onChange={(e) => setForm({ ...form, hotelId: e.target.value })}
                >
                  <option value="">Platform-wide</option>
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <FormError>{error}</FormError>
            <MutationError error={createUser.error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating…' : 'Create user'}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={roleFor !== null} onOpenChange={(open) => !open && setRoleFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign a role</DialogTitle>
          </DialogHeader>
          {roleFor ? <AssignRoleForm userId={roleFor} roles={roles} hotels={hotels} onAssign={(args) => assignRole.mutate(args)} onClose={() => setRoleFor(null)} /> : null}
        </DialogContent>
      </Dialog>
      <MutationError error={assignRole.error} />
      <MutationError error={revokeRole.error} />
    </div>
  );
}

function AssignRoleForm({
  userId,
  roles,
  hotels,
  onAssign,
  onClose,
}: {
  userId: string;
  roles: { name: string; hotelScoped: boolean }[];
  hotels: { id: string; name: string }[];
  onAssign: (args: { userId: string; roleName: string; hotelId?: string }) => void;
  onClose: () => void;
}) {
  const [roleName, setRoleName] = useState(roles[0]?.name ?? '');
  const [hotelId, setHotelId] = useState('');
  const role = roles.find((r) => r.name === roleName);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ar-role">Role</Label>
        <select
          id="ar-role"
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.name} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {role?.hotelScoped ? (
        <div className="space-y-1.5">
          <Label htmlFor="ar-hotel">Hotel</Label>
          <select
            id="ar-hotel"
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
          >
            <option value="">Select a hotel…</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!roleName || (role?.hotelScoped && !hotelId)}
          onClick={() => onAssign({ userId, roleName, hotelId: hotelId || undefined })}
        >
          Assign
        </Button>
      </DialogFooter>
    </div>
  );
}