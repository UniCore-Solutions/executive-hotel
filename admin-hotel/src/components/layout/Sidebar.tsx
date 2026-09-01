'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { GLOBAL_NAV_GROUPS, hotelNavGroups } from './nav-items';

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams<{ hotelId?: string }>();
  const { me } = useSession();
  const hotelId = typeof params.hotelId === 'string' ? params.hotelId : null;
  const groups = hotelId ? hotelNavGroups(hotelId, me?.roles ?? []) : GLOBAL_NAV_GROUPS;

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-black/10 bg-navy-dark text-white lg:flex">
      <Link href={hotelId ? `/hotels/${hotelId}/dashboard` : '/hotels'} className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-navy-dark">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="font-display text-base font-semibold tracking-wide">
          Hotel Collection
          <span className="mt-0.5 block text-[10px] font-sans font-medium tracking-widest text-gold-light uppercase">
            Admin
          </span>
        </span>
      </Link>

      <nav aria-label="Admin navigation" className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold tracking-widest text-white/40 uppercase">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      active ? 'bg-white/10 font-medium text-gold-light' : 'text-white/70 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {hotelId ? (
        <div className="border-t border-white/10 px-3 py-4">
          <Link
            href="/hotels"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            All hotels
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
