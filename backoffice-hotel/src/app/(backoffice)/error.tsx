'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error boundary]', error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
        Something went wrong
      </p>
      <h1 className="font-display text-navy mt-3 text-3xl font-semibold">
        Unexpected error
      </h1>
      <p className="text-navy/55 mx-auto mt-3 max-w-sm text-sm leading-relaxed">
        An unexpected error occurred. Please try again or return to the dashboard.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="bg-navy inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-navy/15 transition-colors hover:bg-navy-light focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          Try again
        </button>
        <Link
          href="/"
          className="border-navy/15 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-navy transition-colors hover:border-navy/30 hover:bg-paper focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
