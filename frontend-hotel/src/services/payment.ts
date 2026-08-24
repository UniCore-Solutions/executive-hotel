/** Payment mock (BOOK-6) — port of RC.payment (mock.js), exact messages. */
import type { PaymentResult } from '@/types';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function charge(input: { card: string; amount: number }): Promise<PaymentResult> {
  await delay(1600);
  const digits = String(input.card || '').replace(/\D/g, '');
  if (digits.length < 12) return { ok: false, message: 'Enter a valid card number.' };
  if (digits.endsWith('1'))
    return {
      ok: false,
      message: 'Your card was declined by the issuing bank. Please try another card.',
    };
  return { ok: true, message: 'Payment authorised' };
}
