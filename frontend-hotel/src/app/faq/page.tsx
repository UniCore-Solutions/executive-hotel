import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';
import FaqClient from './faq-client';
import { getHotelDetails, getCanonicalHotelId } from '@/services/catalog';

export const metadata: Metadata = {
  title: 'FAQ — Executive Hotel',
  description:
    'Answers about check-in, bookings, cancellation and staying at Executive Hotel, Lisbon.',
};

export default async function FaqPage() {
  const canonicalId = await getCanonicalHotelId();
  const details = await getHotelDetails(canonicalId);
  const faqs = (details?.faqs ?? []).map((f) => ({
    question: f.question,
    answer: f.answer,
    category: f.category ?? null,
  }));

  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Good to know
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Frequently asked questions
        </h1>
        <p className="text-navy/60 mt-3 text-sm">
          Search the answers below, or{' '}
          <Link href="/contact" className="text-gold-dark underline">
            write to us
          </Link>
          .
        </p>

        <FaqClient faqs={faqs} />

        <div className="border-navy/10 mt-12 rounded-3xl border bg-white p-6 text-center">
          <p className="font-display text-navy text-xl font-semibold">Still curious?</p>
          <p className="text-navy/55 mt-1 text-sm">
            Our team answers within a few hours, Lisbon time (WET).
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/contact"
              className="bg-navy hover:bg-navy-light rounded-xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase transition-colors"
            >
              Contact us
            </Link>
            <a
              href="tel:+351210000101"
              className="bg-paper border-navy/15 text-navy hover:border-navy/30 rounded-xl border px-5 py-3 text-xs font-bold tracking-widest uppercase"
            >
              +351 21 000 0101
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
