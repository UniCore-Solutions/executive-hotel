import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';
import ContactForm from './contact-form';

export const metadata: Metadata = {
  title: 'Contact — Executive Boutique Hotel Rabat',
  description:
    'Contact Executive Boutique Hotel Rabat — questions before you arrive, transfers, special requests. We answer within a few hours.',
};

export default function ContactPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          We&apos;re here
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Contact us
        </h1>
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="border-navy/10 rounded-3xl border bg-white p-6">
              <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Address
              </p>
              <p className="text-navy/75 mt-2 text-sm">
                72 Rue Oued Sebou, Agdal
                <br />
                10106 Rabat, Morocco
              </p>
            </div>
            <div className="border-navy/10 rounded-3xl border bg-white p-6">
              <p className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                Phone &amp; email
              </p>
              <p className="text-navy/75 mt-2 text-sm">
                <a href="tel:+212537278860" className="hover:text-gold-dark">
                  +212 5 37 27 88 60
                </a>
                <br />
                <Link href="/contact" className="hover:text-gold-dark">
                  Contact form
                </Link>
              </p>
              <p className="text-navy/45 mt-2 text-[11px]">
                Reception open 24/7 · Rabat time (GMT+1)
              </p>
            </div>
            <div className="bg-navy-dark rounded-3xl p-6 text-white">
              <p className="text-gold-light text-xs font-semibold tracking-widest uppercase">
                Getting here
              </p>
              <p className="mt-2 text-sm text-white/70">
                Rabat-Salé Airport is 12 km away — a paid shuttle can be arranged at reception. Free
                private parking on site, and Rabat-Ville station is 2.3 km from the hotel.
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </>
  );
}
