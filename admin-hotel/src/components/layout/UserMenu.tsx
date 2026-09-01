'use client';

import { LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from '@/context/SessionContext';

export function UserMenu({ email, roles }: { email: string; roles: string[] }) {
  const { signOut } = useSession();
  const primaryRole = roles.includes('super_admin') ? 'Super Admin' : (roles[0] ?? 'Staff');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40">
        <span className="flex size-6 items-center justify-center rounded-full bg-navy/10 text-navy">
          <User className="size-3.5" aria-hidden="true" />
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2.5 pb-2 text-xs text-muted-foreground">
          <p className="truncate font-medium text-ink">{email}</p>
          <p className="mt-0.5">{primaryRole.replace(/_/g, ' ')}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
