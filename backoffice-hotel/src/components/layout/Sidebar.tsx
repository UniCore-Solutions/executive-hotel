'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Gavel,
  LayoutDashboard,
  Receipt,
  Star,
  TicketPercent,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/context/SessionContext';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, superAdminOnly: false },
  { href: '/hotels', label: 'Hotels', icon: Building2, superAdminOnly: false },
  { href: '/reservations', label: 'Reservations', icon: CalendarDays, superAdminOnly: false },
  { href: '/guests', label: 'Guests', icon: Users, superAdminOnly: false },
  { href: '/payments', label: 'Payments', icon: Receipt, superAdminOnly: false },
  { href: '/invoices', label: 'Invoices', icon: FileText, superAdminOnly: false },
  { href: '/promotions', label: 'Promotions', icon: TicketPercent, superAdminOnly: false },
  { href: '/reviews', label: 'Reviews', icon: Star, superAdminOnly: false },
  { href: '/notifications', label: 'Notifications', icon: Bell, superAdminOnly: false },
  { href: '/users', label: 'Users & Roles', icon: ClipboardList, superAdminOnly: true },
  { href: '/audit', label: 'Audit Log', icon: Gavel, superAdminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { me } = useSession();
  const isSuperAdmin = me?.roles.includes('super_admin') ?? false;

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-navy-dark text-white md:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold">
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="font-display text-lg font-semibold tracking-wide">Hotel Collection</span>
      </Link>
      <nav aria-label="Back office" className="flex-1 space-y-0.5 px-3 py-2">
        {NAV.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-white/10 font-medium text-gold-light'
                  : 'text-white/70 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}