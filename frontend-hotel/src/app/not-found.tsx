import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';

export default function NotFound() {
  return (
    <>
      <HeaderTheme theme="light" />
      <section className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-4 pt-28 pb-20 text-center sm:px-6 lg:px-8 lg:pt-36">
        <p className="text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Error 404
        </p>
        <h1 className="font-display text-navy mt-3 text-4xl font-semibold sm:text-5xl">
          Page not found
        </h1>
        <p className="text-navy/55 mx-auto mt-4 max-w-md text-sm leading-relaxed sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-navy inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-navy/15 transition-colors hover:bg-navy-light focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            Back to home
          </Link>
          <Link
            href="/search"
            className="border-navy/15 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-navy transition-colors hover:border-navy/30 hover:bg-paper focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            Search rooms
          </Link>
        </div>
      </section>
    </>
  );
}
