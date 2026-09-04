'use client';

import { useMemo, useState } from 'react';
import { Plus, Users as UsersIcon } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminUsersDocument, AdminRolesDocument, MeDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { userColumns, type UserRow } from './columns';
import { CreateUserSheet } from './CreateUserSheet';
import { UserRolesSheet } from './UserRolesSheet';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'email-asc', label: 'Email (A–Z)' },
  { value: 'email-desc', label: 'Email (Z–A)' },
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
];

function compareUsers(a: UserRow, b: UserRow, field: string): number {
  switch (field) {
    case 'email':
      return a.email.localeCompare(b.email);
    case 'createdAt':
      return a.createdAt.localeCompare(b.createdAt);
    case 'name':
    default: {
      const nameA = [a.firstName, a.lastName].filter(Boolean).join(' ') || a.email;
      const nameB = [b.firstName, b.lastName].filter(Boolean).join(' ') || b.email;
      return nameA.localeCompare(nameB);
    }
  }
}

/**
 * Global, platform-wide (not hotel-scoped) — same reach as `/platform/settings`.
 * `adminUsers` has no server args (returns every `User` row in the system —
 * guest accounts and passwordless "provisioned" placeholders included, not
 * just staff — confirmed live: 211 rows, only 3 carrying a non-guest role at
 * the time of writing), so this fetches the one list and filters/sorts it
 * client-side, same honesty tradeoff as the Hotels list (NEW-3). The default
 * "Staff" view hides the guest/provisioned noise; "Show all accounts" is the
 * escape hatch for the one real workflow that needs it — granting a role to
 * someone who already has an account (e.g. a guest hired as front-desk
 * staff) rather than creating a duplicate.
 */
export function UsersListClient() {
  const { search, setSearch, sort, setSort } = useTableState();
  const [showAll, setShowAll] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const { data, loading, error, refetch } = useQuery(AdminUsersDocument);
  const { data: rolesData } = useQuery(AdminRolesDocument);
  const { data: meData } = useQuery(MeDocument);

  const roles = rolesData?.adminRoles ?? [];
  const effectiveSort = sort || 'name-asc';

  const rows = useMemo(() => {
    const items = data?.adminUsers ?? [];
    const staffOnly = showAll ? items : items.filter((u) => u.roles.some((r) => r.roleName !== 'guest'));
    const q = search.trim().toLowerCase();
    const filtered = q
      ? staffOnly.filter((u) =>
          [u.firstName, u.lastName, u.email].some((field) => field?.toLowerCase().includes(q)),
        )
      : staffOnly;
    const [field = 'name', dir] = effectiveSort.split('-');
    const sorted = [...filtered].sort((a, b) => compareUsers(a, b, field));
    return dir === 'desc' ? sorted.reverse() : sorted;
  }, [data, search, showAll, effectiveSort]);

  // Re-select the freshly-refetched row (by identity, not the stale
  // reference) after any assign/revoke write so the open sheet reflects the
  // change instead of showing a snapshot from before the mutation.
  const selected = selectedUser ? (rows.find((u) => u.id === selectedUser.id) ?? selectedUser) : null;

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Staff accounts and the hotel or platform roles they hold. Platform-wide — not scoped to one hotel."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New user
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="max-w-xs"
            aria-label="Search users"
          />
          <div className="w-full max-w-56">
            <Select value={effectiveSort} onValueChange={setSort}>
              <SelectTrigger size="sm" aria-label="Sort users">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="show-all-accounts" checked={showAll} onCheckedChange={setShowAll} />
          <Label htmlFor="show-all-accounts" className="text-xs font-normal text-muted-foreground">
            Show all accounts, including guests
          </Label>
        </div>
      </div>

      <DataTable
        columns={userColumns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={(row) => setSelectedUser(row)}
        emptyIcon={UsersIcon}
        emptyTitle={search ? 'No users match your search' : showAll ? 'No accounts yet' : 'No staff accounts yet'}
        emptyDescription={
          search
            ? 'Try a different name or email.'
            : showAll
              ? undefined
              : 'Create one, or turn on "Show all accounts" to grant a role to an existing guest account.'
        }
      />

      <CreateUserSheet open={createOpen} onOpenChange={setCreateOpen} roles={roles} />
      <UserRolesSheet
        user={selected}
        roles={roles}
        currentUserId={meData?.me.id}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      />
    </>
  );
}
