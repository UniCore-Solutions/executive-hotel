/**
 * Money and date formatting for the admin. The backend performs no currency
 * conversion (CLAUDE.md) — every amount here is MAD. There is exactly one
 * formatter; do not duplicate it (the guest site has two disagreeing FX
 * tables — see the investigation report, §I).
 */

// Whole MAD, no cents — matches the guest site's display convention
// (frontend-hotel's fmtMad/formatPrice) and the server-rendered
// invoice/credit-note PDF (DocumentGenerationServiceImpl#money, backend).
// The backend keeps exact BigDecimal precision; this is a display-only
// rounding choice, applied consistently everywhere money renders in this app.
const MAD_FORMATTER = new Intl.NumberFormat('en-MA', {
  style: 'currency',
  currency: 'MAD',
  currencyDisplay: 'code',
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return MAD_FORMATTER.format(amount);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeToToday(dateStr: string): string {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return formatDate(dateStr);
}

/** Humanizes a SCREAMING_SNAKE or snake_case backend enum value for display. */
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
