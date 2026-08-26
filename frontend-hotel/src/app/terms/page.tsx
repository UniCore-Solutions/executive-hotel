import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Executive Hotel',
};

export default function TermsPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Legal
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="text-navy/45 mt-2 text-xs">Last updated 1 August 2026</p>
        <div className="text-navy/75 mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">
              1. About these terms
            </h2>
            <p>
               These terms apply to bookings made directly at Executive Hotel, 72 Rue
              Oued Sebou, 10106 Rabat, Morocco. This website is a frontend prototype: no real
              contract is formed and no real payment is processed.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">
              2. Bookings &amp; rates
            </h2>
            <p>
              Rates are per room per night in Moroccan Dirham (MAD). Other currencies shown are
              indicative daily conversions. Applicable taxes and fees are itemised in every quote
              shown (rates vary by hotel and rate plan). A booking is confirmed once we display a
              confirmation reference.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">3. Payment</h2>
            <p>
              Your card is authorised for the full stay at booking; the amount is charged according
              to your rate&apos;s cancellation conditions. Card details are processed by our payment
              provider and never stored by us.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">4. Cancellation</h2>
            <p>
              Cancellation conditions are shown with every rate and summarised in the{' '}
              <Link href="/cancellation-policy" className="text-gold-dark underline">
                cancellation policy
              </Link>
              . Refunds are returned to the original payment method within 10 working days.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">5. Guest conduct</h2>
            <p>
              We rely on our guests&apos; good judgement: quiet hours are 22:00–08:00, the hotel is
              non-smoking throughout, and no candles or flames are allowed in guest rooms.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">6. Liability</h2>
            <p>
              We are not liable for force majeure events, for valuables left in rooms (use the
              in-room safety deposit box), or for personal items left unattended in public areas.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">7. Governing law</h2>
            <p>
              These terms are governed by Moroccan law; Rabat courts have jurisdiction. Contact us
              via the{' '}
              <Link href="/contact" className="text-gold-dark underline">
                contact page
              </Link>{' '}
              or by phone: +212 5 37 27 88 60.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
