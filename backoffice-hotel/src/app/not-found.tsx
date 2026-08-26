import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
        Error 404
      </p>
      <h1 className="font-display text-navy mt-3 text-3xl font-semibold">
        Page not found
      </h1>
      <p className="text-navy/55 mx-auto mt-3 max-w-sm text-sm leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="bg-navy inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-navy/15 transition-colors hover:bg-navy-light focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
