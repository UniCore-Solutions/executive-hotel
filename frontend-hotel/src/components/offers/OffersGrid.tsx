'use client';

/* Offers grid — port of offers.js. Feasibility chips validate each code against
   the first room + eligible plan for the visitor's dates; Apply carries the
   current stay state + promo into the search page. */

import { Button } from '@/components/ui/button';
import { OFFERS, PROPERTY } from '@/data';
import { useSearch } from '@/context/SearchContext';
import { useToast } from '@/context/ToastContext';
import { nightsBetween } from '@/lib/dates';
import { validatePromo } from '@/services/pricing';
import { searchURL } from '@/lib/links';

const PLAN_LABELS: Record<string, string> = {
  bb: 'Bed & Breakfast',
  ro: 'Room Only',
  hb: 'Half Board',
};

export default function OffersGrid() {
  const { state } = useSearch();
  const { toast } = useToast();
  const hasDates = !!(state.checkin && state.checkout);
  const nights = nightsBetween(state.checkin, state.checkout);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ message: `${code} copied to your clipboard.`, type: 'ok', title: 'Code copied' });
    } catch {
      toast({ message: `Use code ${code} at booking.`, type: 'info' });
    }
  };

  const feasibility = (code: string, plan: string) => {
    if (!hasDates) return null;
    const probe = PROPERTY.rooms[0]!;
    const probePlan = `${probe.id}::${plan}`;
    const res = validatePromo(code, { nights, checkin: state.checkin, planId: probePlan });
    if (res.valid) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-700/10 px-3 py-1 text-[11px] font-semibold text-emerald-700">
          Applies to your dates ✓
        </span>
      );
    }
    return (
      <span className="text-clay bg-clay/10 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold">
        {res.message}
      </span>
    );
  };

  return (
    <div id="offers-list" className="mt-10 grid gap-6 lg:grid-cols-2">
      {OFFERS.map((o) => (
        <article
          key={o.code}
          className="border-navy/10 flex flex-col gap-4 rounded-3xl border bg-white p-7 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <span className="font-display text-gold-dark text-4xl font-semibold">{o.badge}</span>
            <span className="text-navy/45 text-right text-[11px] font-semibold tracking-wider uppercase">
              {o.stayWindow.from} → {o.stayWindow.to}
            </span>
          </div>
          <div>
            <h2 className="font-display text-navy text-2xl font-semibold">{o.title}</h2>
            <p className="text-navy/65 mt-2 text-sm">{o.desc}</p>
          </div>
          <ul className="text-navy/60 space-y-1.5 text-xs">
            {o.conditions.map((c) => (
              <li key={c} className="flex items-start gap-2">
                <span className="text-gold-dark mt-0.5">✦</span>
                {c}
              </li>
            ))}
            <li className="flex items-start gap-2 pt-1">
              <span className="text-gold-dark mt-0.5">✦</span>
              Eligible plans:{' '}
              <strong className="text-navy/80">
                {o.eligiblePlans.map((p) => PLAN_LABELS[p]).join(', ')}
              </strong>
            </li>
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {feasibility(o.code, o.eligiblePlans[0]!)}
            <span className="text-navy bg-paper border-navy/25 inline-flex items-center gap-1.5 rounded-xl border border-dashed px-3.5 py-2 text-sm font-bold">
              {o.code}
              <Button
                type="button"
                data-copy={o.code}
                onClick={() => copy(o.code)}
                variant="ghost"
                className="text-navy/45 hover:text-navy"
                aria-label={`Copy code ${o.code}`}
              >
                ⧉
              </Button>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={searchURL(state, { promo: o.code })}
              className="bg-navy hover:bg-navy-light shadow-navy/15 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg transition-colors"
            >
              Apply this offer
            </a>
            <Button
              type="button"
              data-copy={o.code}
              onClick={() => copy(o.code)}
              variant="ghost"
              className="px-3"
            >
              Copy code
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
