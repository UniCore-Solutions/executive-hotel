import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';

export const metadata: Metadata = {
  title: 'Cancellation policy — Executive Boutique Hotel Rabat',
};

export default function CancellationPolicyPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Legal
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Cancellation policy
        </h1>
        <p className="text-navy/45 mt-2 text-xs">
          Last updated 1 August 2026 · Applies to direct bookings; see your confirmation for the
          conditions of your specific rate.
        </p>
        <div className="text-navy/75 mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">
              Flexible rates (Bed &amp; Breakfast, Half Board)
            </h2>
            <p>
              Free cancellation until 72 hours before arrival (Rabat time). After that, one
              night&apos;s stay is charged. If you leave early, the unused nights are not refunded.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">Room-only rates</h2>
            <p>
              These rates are non-refundable: the full stay is charged at booking regardless of
              cancellation. Best rate guarantee does not apply to them.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">Promotional stays</h2>
            <p>
              Stays booked with a discount code follow the conditions of the rate they apply to,
              with one exception: if you cancel after the free-cancellation window, the discount is
              first recaptured from your refund.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">How to cancel</h2>
            <p>
              Use the &quot;Manage booking&quot; page (link in your confirmation email and in the
              footer), or{' '}
              <Link href="/contact" className="text-gold-dark underline">
                contact us
              </Link>{' '}
              with your booking reference. Refunds land on the original card within 10 working days.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">No-show</h2>
            <p>
              Guests who do not arrive and do not cancel are charged the first night, or the full
              stay for room-only rates.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
