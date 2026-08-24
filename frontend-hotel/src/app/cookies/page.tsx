import type { Metadata } from 'next';
import HeaderTheme from '@/components/layout/HeaderTheme';
import CookiesPanel from '@/components/layout/CookiesPanel';

export const metadata: Metadata = {
  title: 'Cookie policy — Executive Boutique Hotel Rabat',
};

export default function CookiesPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Legal
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Cookie policy
        </h1>
        <p className="text-navy/45 mt-2 text-xs">Last updated 1 August 2026</p>
        <div className="text-navy/75 mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">What we use</h2>
            <p>
              Essential cookies keep the search, booking and preference flow working (currency,
              language, consent choices). Analytics and preference cookies are only stored after you
              give consent — the banner you saw when you arrived.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">How long</h2>
            <p>
              Essential cookies expire after 30 days of inactivity; consent choices are remembered
              for 12 months, after which we ask again.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">
              Change your choices
            </h2>
            <p>
              Use the switches below — your choices are saved immediately and are the same as
              choosing &quot;Manage&quot; from the footer banner.
            </p>
          </section>
        </div>
        <CookiesPanel />
      </div>
    </>
  );
}
