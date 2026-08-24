'use client';

import { useSession } from '@/context/SessionContext';
import { HotelSwitcher } from '@/components/layout/HotelSwitcher';
import { UserMenu } from '@/components/layout/UserMenu';

export function Topbar() {
  const { me } = useSession();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-paper/90 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Back Office</span>
      </div>
      <div className="flex items-center gap-3">
        <HotelSwitcher />
        {me ? <UserMenu email={me.email} /> : null}
      </div>
    </header>
  );
}