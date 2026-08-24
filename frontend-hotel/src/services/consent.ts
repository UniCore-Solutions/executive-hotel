/** Consent store (ANA-1) — port of RC.consent (mock.js). */
import type { ConsentState } from '@/types';
import { toISODate } from '@/lib/dates';

const KEY = 'rc_consent_v1';
const CONSENT_DEFAULT: ConsentState = {
  necessary: true,
  analytics: false,
  preferences: false,
  updatedAt: null,
  chosen: false,
};

function read<T>(k: string, fb: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? 'null');
    return v ?? fb;
  } catch {
    return fb;
  }
}

function write(k: string, v: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* noop */
  }
}

export function get(): ConsentState {
  return { ...CONSENT_DEFAULT, ...read<Partial<ConsentState>>(KEY, CONSENT_DEFAULT) };
}

export function save(c: Partial<ConsentState>): ConsentState {
  const next = { ...get(), ...c, chosen: true, updatedAt: toISODate(new Date()) };
  write(KEY, next);
  return next;
}

export function reset(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
