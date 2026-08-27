/** QuoteTable — pricing breakdown, exact port of RC.ui.quoteTable (ui.js). */
import type { PriceBreakdown, CurrencyCode } from '@/types';
import { fmtPrice } from '@/lib/format';

interface QuoteTableProps {
  quote: PriceBreakdown;
  currency?: CurrencyCode;
  totalLabel?: string;
  highlight?: boolean;
  note?: string;
}

export function QuoteTable({
  quote: b,
  currency = 'MAD',
  totalLabel = 'Total',
  highlight,
  note = '',
}: QuoteTableProps) {
  const displayCurrency: CurrencyCode = (b.currency ?? currency) as CurrencyCode;
  const fmt = (n: number) => fmtPrice(n, displayCurrency);
  const taxLabel =
    b.taxRate != null && b.taxRate > 0
      ? `Taxes & fees (${Math.round(b.taxRate * 100)}%)`
      : 'Taxes & fees';
  const rows: Array<[string, string, string, boolean]> = [
    [
      'Rooms',
      `${b.rooms} × ${fmtPrice(b.perNight, displayCurrency, { perNight: true })} × ${b.nights} ${b.nights === 1 ? 'night' : 'nights'}`,
      fmt(b.roomSubtotal),
      false,
    ],
  ];
  if (b.discount > 0) {
    rows.push([
      `Promo ${b.promo?.code || ''}`,
      b.promo?.offer ? b.promo.offer.badge : '',
      `−${fmt(b.discount)}`,
      true,
    ]);
  }
  if (b.extrasTotal > 0) {
    if (b.extras?.length) {
      for (const x of b.extras) {
        rows.push([
          x.name,
          `${x.quantity} × ${fmt(x.unitPrice)}`,
          fmt(x.totalPrice),
          false,
        ]);
      }
    } else {
      rows.push(['Extras & services', '', fmt(b.extrasTotal), false]);
    }
  }
  rows.push([taxLabel, '', fmt(b.taxes), false]);

  const totalRow = highlight ? (
    <div className="bg-gold/[0.09] border-gold/25 mt-3 flex items-baseline justify-between gap-3 rounded-2xl border px-4 py-3">
      <dt className="font-display text-navy text-base font-semibold">{totalLabel}</dt>
      <dd className="font-display text-navy text-2xl font-bold">{fmt(b.total)}</dd>
    </div>
  ) : (
    <div className="border-navy/10 mt-2 flex items-baseline justify-between gap-3 border-t pt-3">
      <dt className="font-display text-navy text-base font-semibold">{totalLabel}</dt>
      <dd className="font-display text-navy text-xl font-bold">{fmt(b.total)}</dd>
    </div>
  );

  return (
    <>
      <dl className="space-y-2.5 text-sm">
        {rows.map(([k, sub, v, promo]) => (
          <div key={k} className="flex min-w-0 items-baseline justify-between gap-3">
            <dt className="text-navy/70 min-w-0">
              {k}
              {sub ? <span className="text-navy/40 block text-xs">{sub}</span> : null}
            </dt>
            <dd
              className={`text-navy font-semibold whitespace-nowrap ${promo ? 'text-emerald-700' : ''}`}
            >
              {v}
            </dd>
          </div>
        ))}
        {totalRow}
      </dl>
      <div className="text-navy/40 text-[11px]">
        Indicative price in {displayCurrency} · billed in {displayCurrency} · {note}
      </div>
    </>
  );
}
