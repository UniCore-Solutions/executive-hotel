/** When a rate is settled — the rate plan's `payment_timing`. */
import type { PaymentTiming } from '@/types';
import { Badge } from './Badge';

interface TimingCopy {
  /** Short badge label. */
  label: string;
  /** One line explaining what actually happens, for the rate detail. */
  detail: string;
}

export function paymentTimingCopy(timing: PaymentTiming, depositPercentage?: number): TimingCopy {
  switch (timing) {
    case 'pay_at_property':
      return {
        label: 'Pay at the hotel',
        detail: 'Nothing is charged now — you settle the full amount at the property.',
      };
    case 'prepay_deposit':
      return {
        label: depositPercentage ? `${depositPercentage}% deposit now` : 'Deposit now',
        detail: depositPercentage
          ? `A ${depositPercentage}% deposit is taken at booking; the balance is due at the property.`
          : 'A deposit is taken at booking; the balance is due at the property.',
      };
    case 'prepay_full':
    default:
      return {
        label: 'Pay now',
        detail: 'The full amount is charged when you confirm the booking.',
      };
  }
}

/** `pay_at_property` is the commercially notable case, so it gets the gold
    treatment; prepaid rates stay neutral rather than competing with it. */
export function PaymentTimingBadge({
  timing,
  depositPercentage,
  className = '',
}: {
  timing: PaymentTiming;
  depositPercentage?: number;
  className?: string;
}) {
  const { label } = paymentTimingCopy(timing, depositPercentage);
  return (
    <Badge variant={timing === 'prepay_full' ? 'plan' : 'gold'} className={className}>
      {label}
    </Badge>
  );
}
