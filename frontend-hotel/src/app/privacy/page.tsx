import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';

export const metadata: Metadata = {
  title: 'Privacy notice — Executive Boutique Hotel Rabat',
};

export default function PrivacyPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Legal
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Privacy notice
        </h1>
        <p className="text-navy/45 mt-2 text-xs">Last updated 1 August 2026</p>
        <div className="text-navy/75 mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">What we collect</h2>
            <p>
              When you book, we collect the details you provide: names, email, phone, arrival time
              and any special requests. When you create an account, we store your name, email and
              password (hashed in production). Booking data on this prototype stays in your
              browser&apos;s local storage.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">Why we use it</h2>
            <p>
              To confirm and manage your stay (contractual necessity), to send service messages, to
              comply with Moroccan guest-registration law (passport details at check-in), and — only
              with consent — to send offers and measure site usage.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">Cookies</h2>
            <p>
              Essential cookies keep the search and booking flow working and store your preferences.
              Analytics and preference cookies are only set after you choose them — see the{' '}
              <Link href="/cookies" className="text-gold-dark underline">
                cookie policy
              </Link>{' '}
              and adjust your choices any time in the footer.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">Who we share with</h2>
            <p>
              Payment providers (card processing only), local guides and transfer partners involved
              in your stay, and public authorities where Moroccan law requires. We never sell your
              data.
            </p>
          </section>
          <section>
            <h2 className="font-display text-navy mb-2 text-lg font-semibold">Your rights</h2>
            <p>
              You may request access, correction or deletion of your personal data at any time via
              the{' '}
              <Link href="/contact" className="text-gold-dark underline">
                contact page
              </Link>{' '}
              or by phone at +212 5 37 27 88 60. Complaints may be lodged with the CNDP (cndp.ma).
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
