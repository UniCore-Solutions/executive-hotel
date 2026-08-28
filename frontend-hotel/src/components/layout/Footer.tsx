/** Footer — port of RC.footerTemplate (common.js), links adapted to Next routes. */
'use client';

import Link from 'next/link';
import { useSearch } from '@/context/SearchContext';
import { useModal } from '@/context/ModalContext';
import ConsentDialog from '@/components/layout/ConsentDialog';
import { TEL, TEL_DISPLAY } from '@/constants/navigation';
import type { PlatformIdentity } from '@/services/platform';
import type { CanonicalHotel } from '@/services/canonicalHotel';

interface FooterProps {
  platform?: PlatformIdentity | null;
  hotel?: CanonicalHotel | null;
}

export default function Footer({ platform, hotel }: FooterProps) {
  const { state } = useSearch();
  const { open } = useModal();

  /* Single-property platform: the brand IS the hotel (same identity as the
     platform record). No hardcoded brand fallback. */
  const brandName = hotel?.name ?? platform?.name ?? '';
  const brandLine = platform?.tagline ?? 'Direct booking';
  const brandDescription =
    platform?.description ??
    (hotel?.description ??
      'A four-star seaside hotel on Lisbon\u2019s Marina — book direct for live availability.');
  const hotelAddress = hotel
    ? [hotel.addressLine1, hotel.addressLine2, hotel.city, hotel.countryCode]
        .filter(Boolean)
        .join(', ')
    : null;
  /* Real hotel phone when the backend provides one — the constants phone is
     only a fallback. */
  const telHref = hotel?.phone ? `tel:${hotel.phone.replace(/[\s()-]/g, '')}` : TEL;
  const telDisplay = hotel?.phone ?? TEL_DISPLAY;

  return (
    <footer className="bg-navy-dark text-white/80 pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-lg font-semibold text-white">{brandName}</p>
            <p className="text-gold-light mt-1 text-[11px] tracking-[0.22em] uppercase">
              {brandLine}
            </p>
            <p className="mt-4 max-w-xs text-sm text-white/60">{brandDescription}</p>
          </div>
          <div>
            <p className="text-gold-light mb-4 text-xs font-semibold tracking-[0.18em] uppercase">
              Stay
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/hotel#rooms" className="transition-colors hover:text-white">
                  Rooms &amp; suites
                </Link>
              </li>
              <li>
                <Link href="/offers" className="transition-colors hover:text-white">
                  Offers
                </Link>
              </li>
              <li>
                <Link href="/search" className="transition-colors hover:text-white">
                  Check availability
                </Link>
              </li>
              <li>
                <Link href="/hotel#experiences" className="transition-colors hover:text-white">
                  Experiences
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-gold-light mb-4 text-xs font-semibold tracking-[0.18em] uppercase">
              Support
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/reservation" className="transition-colors hover:text-white">
                  My reservation
                </Link>
              </li>
              <li>
                <Link href="/checkin" className="transition-colors hover:text-white">
                  Online check-in
                </Link>
              </li>
              <li>
                <Link href="/faq" className="transition-colors hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-white">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/account" className="transition-colors hover:text-white">
                  Guest account
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => open(<ConsentDialog />)}
                  className="cursor-pointer text-left transition-colors hover:text-white"
                >
                  Cookie settings
                </button>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-gold-light mb-4 text-xs font-semibold tracking-[0.18em] uppercase">
              Contact
            </p>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li>
                <a href={telHref} className="transition-colors hover:text-white">
                  {telDisplay}
                </a>
              </li>
              <li>
                <Link href="/contact" className="transition-colors hover:text-white">
                  Contact us — we answer within a few hours
                </Link>
              </li>
              <li>{hotelAddress ?? 'Avenida da Marina 42, Doca de Alcântara, Lisbon'}</li>
              <li className="pt-2">
                Check-in {hotel?.checkInTime ?? '15:00'}–23:30 · Check-out 06:00–
                {hotel?.checkOutTime ?? '12:00'}
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/60 lg:flex-row">
          <p>© 2026 {brandName}. Book direct — live availability, real confirmations.</p>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
            aria-label="Legal"
          >
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/cookies" className="transition-colors hover:text-white">
              Cookies
            </Link>
            <Link href="/cancellation-policy" className="transition-colors hover:text-white">
              Cancellation policy
            </Link>
            <span className="hidden lg:inline">
              Prices in {state.currency} · indicative · billed in MAD
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
