'use client';

import { useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';
import { GLOBAL_NAV_GROUPS, hotelNavGroups } from './nav-items';

export function MobileNav() {
  const pathname = usePathname();
  const params = useParams<{ hotelId?: string }>();
  const { me } = useSession();
  const hotelId = typeof params.hotelId === 'string' ? params.hotelId : null;
  const groups = hotelId ? hotelNavGroups(hotelId, me?.roles ?? []) : GLOBAL_NAV_GROUPS;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <SheetContent className="max-w-72 bg-navy-dark text-white">
        <SheetHeader className="border-white/10">
          <SheetTitle className="flex items-center gap-2.5 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-navy-dark">
              <Building2 className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            Hotel Collection
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-1 text-[10px] font-semibold tracking-widest text-white/40 uppercase">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        active ? 'bg-white/10 font-medium text-gold-light' : 'text-white/70 hover:bg-white/5',
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
          {hotelId ? (
            <div className="border-t border-white/10 pt-3">
              <Link
                href="/hotels"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/5"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                All hotels
              </Link>
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
