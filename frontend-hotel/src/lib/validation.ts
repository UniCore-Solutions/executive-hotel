/** Field-level validators — exact messages/regexes ported from page scripts. */

export const NAME_RE = /^[A-Za-zÀ-ÿ' -]+$/;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_RE = /^[+\d][\d\s.-]{6,}$/;
export const CARD_RE = /^\d{13,19}$/;
export const CVC_RE = /^\d{3,4}$/;

export const MSGS = {
  firstName: 'Enter your first name.',
  lastName: 'Enter your last name.',
  email: 'Enter a valid email address.',
  phone: 'Enter a valid phone number.',
  cardName: 'Enter the name on the card.',
  cardNumber: 'Enter a valid card number.',
  cardExpiry: 'Enter a valid future expiry.',
  cardCvc: 'Enter a valid CVC.',
  terms: 'Please accept the Terms and Cancellation policy.',
  password: 'Enter your password.',
  passwordLen: 'Password must be at least 6 characters.',
  passwordConfirm: 'Please confirm your password.',
  passwordMismatch: 'Passwords do not match.',
  ciName: 'Enter the lead guest name.',
  ciDoc: 'Enter a valid ID / passport number.',
  ciPhone: 'Enter a valid mobile number.',
} as const;

export function validName(v: string): boolean {
  return !!v && NAME_RE.test(v);
}

export function validEmail(v: string): boolean {
  return EMAIL_RE.test(v);
}

export function validPhone(v: string): boolean {
  return PHONE_RE.test(v);
}

export function validCard(v: string): boolean {
  return CARD_RE.test(v.replace(/\D/g, ''));
}

/** Expiry "MM/YY" — must be a future month. */
export function validExpiry(v: string): boolean {
  const parts = (v || '').split('/');
  if (parts.length !== 2) return false;
  const mm = parseInt(parts[0] ?? '', 10);
  const yy = parseInt(parts[1] ?? '', 10);
  if (!(mm >= 1 && mm <= 12) || !(yy >= 0 && yy <= 99)) return false;
  const now = new Date();
  return (
    !(yy + 2000 < now.getFullYear()) &&
    !(yy + 2000 === now.getFullYear() && mm < now.getMonth() + 1)
  );
}

export function validCvc(v: string): boolean {
  return CVC_RE.test(v);
}

/** Card input formatting: digits only, grouped 4 (max 16). */
export function fmtCardNumber(v: string): string {
  return v
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Expiry input formatting: MM/YY auto-slash. */
export function fmtExpiry(v: string): string {
  let s = v.replace(/\D/g, '').slice(0, 4);
  if (s.length > 2) s = `${s.slice(0, 2)}/${s.slice(2)}`;
  return s;
}
