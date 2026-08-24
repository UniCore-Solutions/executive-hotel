/** Promo code input with validation + quote update (D-6: valid codes flow through). */
'use client';

import { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { validatePromo } from '@/services/pricing';
import { ensurePricingSources } from '@/services/pricingHydration';
import { Input } from './input';
import { Button } from './button';
import type { PromoResult } from '@/types';

interface PromoFieldProps {
  promo: string;
  onChange: (code: string) => void;
  onValidate: (result: PromoResult) => void;
  nights: number;
  checkin?: string;
  planId?: string;
  roomName?: string;
  compact?: boolean;
}

export function PromoField({
  promo,
  onChange,
  onValidate,
  nights,
  checkin,
  planId,
  compact,
}: PromoFieldProps) {
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<PromoResult | null>(null);
  const [touched, setTouched] = useState(false);

  // Backend promo codes (SPRING25, …) must be known before validation.
  useEffect(() => {
    ensurePricingSources();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = promo.trim();
    if (!code) {
      onChange('');
      onValidate({
        valid: false,
        code: '',
        offer: null,
        message: 'Enter a promo code to check it.',
      });
      return;
    }
    setValidating(true);
    const res = validatePromo(code, { nights, checkin, planId: planId ?? '' });
    setResult(res);
    setTouched(true);
    onValidate(res);
    setValidating(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toUpperCase());
    setTouched(false);
    setResult(null);
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? 'flex gap-2' : 'space-y-2'}>
      <div className={compact ? 'flex-1' : ''}>
        <Input
          value={promo}
          onChange={handleChange}
          placeholder="Promo code"
          aria-label="Promo code"
          disabled={validating}
          className={compact ? '' : undefined}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={validating}
        className={compact ? 'shrink-0' : 'w-full sm:w-auto'}
      >
        {validating && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        Apply
      </Button>
      {(touched || result) && result && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${result.valid ? 'text-emerald-700' : 'text-clay'} mt-1 ${compact ? '' : ''}`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
