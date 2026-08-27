'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { useSession } from '@/context/SessionContext';
import { useLang } from '@/hooks/useLang';
import { PROPERTY } from '@/data';
import { CURRENCY_INFO } from '@/lib/format';
import { TEL, TEL_DISPLAY, NAV_LINKS, MOBILE_UTILITY_LINKS } from '@/constants/navigation';
import { Icon } from '@/components/ui/Icon';
import type { PlatformIdentity } from '@/services/platform';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onHome?: boolean;
  platform?: PlatformIdentity | null;
}

export default function Header({ onHome = false, platform }: HeaderProps) {
  const pathname = usePathname();
  const search = useSearch();
  const { lang, setLang, t, langs } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drop, setDrop] = useState<'lang' | 'cur' | ''>('');
  const { session: sess } = useSession();

  const brandName = platform?.name ?? PROPERTY.name;
  const brandLine = platform?.tagline ?? `${PROPERTY.brand} · ${PROPERTY.city}`;

  const home = onHome || pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const accountName = ((sess?.name || '').split(' ')[0] || '').trim();
  const accountLabel = accountName ? `${accountName}'s account` : 'Account';

  const navItems = NAV_LINKS.map((l) => [t(l.labelKey), home ? l.homeRef : l.ref] as const);
  const bookHref = home ? '/#search' : '/search';

  const pickCurrency = (code: string) => {
    search.setCurrency(code as never);
  };

  return (
    <header
      className="fixed top-0 right-0 left-0 z-40"
      data-header-solid
      data-scrolled={scrolled ? '1' : undefined}
    >
      <div className="utility-bar hdr-utility relative z-10 text-white/85">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-[11px] sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <a
              href={TEL}
              className="hdr-utility-link hidden shrink-0 items-center gap-1.5 transition-colors hover:text-white sm:inline-flex"
            >
              <Icon name="phone" className="h-3 w-3" />
              {TEL_DISPLAY}
            </a>
            <span className="hdr-utility-dim hidden truncate text-white/50 md:inline">
              72 Rue Oued Sebou · {PROPERTY.area}, {PROPERTY.city} · Check-in {PROPERTY.checkIn}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <DropdownMenu open={drop === 'lang'} onOpenChange={(v) => setDrop(v ? 'lang' : '')}>
              <DropdownMenuTrigger
                aria-label={t('language')}
                className="dropdown-toggle hdr-utility-link inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:text-white"
              >
                <Icon name="globe" className="h-3 w-3" />
                <span className="uppercase">{lang}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {langs.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setDrop('');
                    }}
                    className={`w-full text-left ${lang === l.code ? 'bg-paper font-semibold' : ''}`}
                  >
                    {l.native}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={drop === 'cur'} onOpenChange={(v) => setDrop(v ? 'cur' : '')}>
              <DropdownMenuTrigger
                aria-label={t('currency')}
                className="dropdown-toggle hdr-utility-link inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:text-white"
              >
                <span>
                  {CURRENCY_INFO.find((c) => c.code === search.state.currency)?.symbol ?? 'MAD'}{' '}
                  {search.state.currency}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                {CURRENCY_INFO.map((c) => (
                  <DropdownMenuItem
                    key={c.code}
                    onClick={() => pickCurrency(c.code)}
                    className={`w-full text-left ${search.state.currency === c.code ? 'bg-paper font-semibold' : ''}`}
                  >
                    {c.symbol} {c.code} <span className="text-navy/40 ml-1">{c.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/reservation"
              className="hdr-utility-link ml-1 hidden px-1 text-white/70 transition-colors hover:text-white sm:inline-flex"
            >
              {t('myReservation')}
            </Link>
            <Link
              href="/account"
              className="hdr-utility-link ml-1 hidden max-w-[12rem] overflow-hidden px-1 text-ellipsis whitespace-nowrap text-white/70 transition-colors hover:text-white md:inline-flex"
            >
              {accountLabel}
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-[5] mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 lg:h-20 lg:gap-3">
          <Link
            href="/"
            className="group flex min-w-0 flex-1 items-center gap-2.5 lg:flex-none"
            aria-label={`${brandName} — home`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <Image
                src="/logo.jpg"
                alt="Executive Hotel logo"
                className="h-full w-full object-cover"
                width={36}
                height={36}
                priority
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="hdr-logo-name font-display text-navy block truncate text-[13px] leading-tight font-semibold tracking-tight sm:text-[15px] lg:text-lg">
                {brandName}
              </span>
              <span className="hdr-brand-line text-gold-dark hidden truncate text-[10px] tracking-[0.22em] uppercase sm:block">
                {brandLine}
              </span>
            </span>
          </Link>

          <nav
            className="hdr-nav text-navy/80 hidden items-center gap-7 text-[13px] font-medium lg:flex"
            aria-label="Main"
          >
            {navItems.map(([label, href]) => (
              <Link key={label} href={href} className="hover:text-navy transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <Link
              href={bookHref}
              className="hdr-cta bg-navy hover:bg-navy-light shadow-navy/20 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[10px] font-bold tracking-widest whitespace-nowrap text-white uppercase shadow-lg transition-colors sm:px-4 sm:text-xs lg:h-auto lg:px-5 lg:py-2.5"
            >
              {t('bookNow')}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="hdr-toggle border-navy/15 text-navy inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border lg:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        className="bg-paper border-navy/10 overflow-hidden border-b transition-[max-height] duration-300 lg:hidden"
        style={{ maxHeight: menuOpen ? 360 : 0 }}
        hidden={!menuOpen}
      >
        <nav className="space-y-1 px-6 py-5" aria-label="Mobile">
          {[
            ...NAV_LINKS.map((l) => [t(l.labelKey), home ? l.homeRef : l.ref] as const),
            ...MOBILE_UTILITY_LINKS.map((l) => [l.label, l.href] as const),
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-navy block py-2.5 text-sm font-semibold"
            >
              {label}
            </Link>
          ))}
          <div className="border-navy/10 mt-3 grid grid-cols-2 gap-2 border-t pt-3">
            <a href={TEL} className="text-navy/70 text-xs font-semibold">
              ☎ {TEL_DISPLAY}
            </a>
            <Link href="/reservation" className="text-navy/70 text-xs font-semibold">
              My reservation
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
