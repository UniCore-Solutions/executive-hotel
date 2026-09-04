'use client';

import { usePathname, useParams } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { MobileNav } from '@/components/layout/MobileNav';
import { UserMenu } from '@/components/layout/UserMenu';
import { visibleGlobalNavGroups, hotelNavGroups, type NavGroup } from './nav-items';

function currentLabel(pathname: string, groups: NavGroup[]): string {
  for (const group of groups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return item.label;
    }
  }
  return 'Admin';
}

export function Topbar() {
  const { me } = useSession();
  const pathname = usePathname();
  const params = useParams<{ hotelId?: string }>();
  const hotelId = typeof params.hotelId === 'string' ? params.hotelId : null;
  const groups = hotelId ? hotelNavGroups(hotelId, me?.roles ?? []) : visibleGlobalNavGroups(me?.roles ?? []);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-paper/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <span className="text-sm font-medium text-ink lg:hidden">{currentLabel(pathname, groups)}</span>
      </div>
      <div className="flex items-center gap-3">{me ? <UserMenu email={me.email} roles={me.roles} /> : null}</div>
    </header>
  );
}
