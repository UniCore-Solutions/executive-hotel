import { describe, expect, it } from 'vitest';
import { isLoggedIn, login, logout, register, reset, seedUsers, session } from '@/services/auth';
import { get as getConsent, save as saveConsent } from '@/services/consent';
import { subscribe } from '@/services/newsletter';
import { charge } from '@/services/payment';
import { evaluate } from '@/services/cancellation';
import { query } from '@/services/siteSearch';
import type { Reservation } from '@/types';

describe('auth', () => {
  it('seeds the demo user once', () => {
    const users = seedUsers();
    expect(users.some((u) => u.email === 'demo@hotelcollection.com')).toBe(true);
    expect(seedUsers().length).toBe(users.length);
  });

  it('login succeeds for the demo user and fails otherwise (exact message)', async () => {
    const ok = await login('demo@hotelcollection.com', 'demo1234');
    expect(ok).toMatchObject({
      ok: true,
      user: { email: 'demo@hotelcollection.com', name: 'Adam Benali' },
    });
    expect(session()?.email).toBe('demo@hotelcollection.com');
    expect(isLoggedIn()).toBe(true);
    const bad = await login('demo@hotelcollection.com', 'wrong');
    expect(bad).toMatchObject({ ok: false, message: 'Incorrect email or password.' });
    logout();
    expect(isLoggedIn()).toBe(false);
  });

  it('register creates a session; duplicates are rejected (exact message)', async () => {
    const ok = await register({
      name: 'Nadia Alaoui',
      email: 'nadia@test.dev',
      password: 'secret1',
    });
    expect(ok.ok).toBe(true);
    expect(session()?.name).toBe('Nadia Alaoui');
    logout();
    const dup = await register({ name: 'X', email: 'NADIA@test.dev', password: 'secret1' });
    expect(dup.message).toBe('An account with this email already exists. Sign in instead.');
  });

  it('reset validates email (exact messages)', async () => {
    expect((await reset('nope')).message).toBe('Enter a valid email address.');
    expect((await reset('x@y.dev')).ok).toBe(true);
  });
});

describe('consent', () => {
  it('defaults to necessary-only, not chosen', () => {
    expect(getConsent()).toMatchObject({
      necessary: true,
      analytics: false,
      preferences: false,
      chosen: false,
    });
  });

  it('save marks chosen and stamps updatedAt', () => {
    saveConsent({ analytics: true });
    const c = getConsent();
    expect(c.chosen).toBe(true);
    expect(c.analytics).toBe(true);
    expect(c.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('newsletter', () => {
  it('validates email and consent (exact messages)', async () => {
    expect((await subscribe('nope', true)).message).toBe('Enter a valid email address.');
    expect((await subscribe('a@b.dev', false)).message).toBe(
      'Please tick the box to consent to receiving our newsletter.'
    );
    const ok = await subscribe('a@b.dev', true);
    expect(ok.ok).toBe(true);
    expect(ok.message).toContain('double opt-in');
  });
});

describe('payment', () => {
  it('declines cards ending in 1 and short numbers (exact messages)', async () => {
    const short = await charge({ card: '41111', amount: 100 });
    expect(short).toMatchObject({ ok: false, message: 'Enter a valid card number.' });
    const declined = await charge({ card: '4111111111111111', amount: 100 });
    expect(declined).toMatchObject({
      ok: false,
      message: 'Your card was declined by the issuing bank. Please try another card.',
    });
    const ok = await charge({ card: '4111111111111112', amount: 100 });
    expect(ok.ok).toBe(true);
  });
});

describe('cancellation', () => {
  const base: Reservation = {
    ref: 'RC-CANCEL',
    email: 'x@y.dev',
    status: 'confirmed',
    checkedIn: false,
    createdAt: '2026-08-01',
    guest: {
      title: 'Mr',
      firstName: 'A',
      lastName: 'B',
      email: 'x@y.dev',
      phone: 'x',
      country: 'MA',
      arrival: '',
      requests: '',
    },
    hotelId: 'executive-boutique-rabat',
    roomId: 'double-or-twin',
    planId: 'double-or-twin::bb',
    checkin: '',
    checkout: '',
    adults: 2,
    children: 0,
    rooms: 1,
    extras: [],
    promo: '',
    price: {
      perNight: 910,
      nights: 4,
      roomSubtotal: 3640,
      discount: 0,
      taxes: 437,
      extrasTotal: 0,
      total: 4077,
      originalTotal: 4077,
    },
  };

  it('ro plans are non-refundable (exact label)', () => {
    const est = evaluate({ ...base, planId: 'r::ro', price: { ...base.price, total: 4077 } });
    expect(est.fee).toBe(4077);
    expect(est.refund).toBe(0);
    expect(est.label).toBe('Non-refundable — the full stay of MAD\u00a04,077 is charged.');
  });

  it('free window: outside → no fee, inside → one night', () => {
    const far = evaluate({ ...base, checkin: '2030-09-12' });
    expect(far.fee).toBe(0);
    expect(far.refund).toBe(4077);
    expect(far.label).toBe('Free cancellation');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const near = evaluate({ ...base, checkin: iso });
    expect(near.fee).toBe(910);
    expect(near.label).toBe('One night charged');
  });
});

describe('siteSearch', () => {
  it('finds rooms, offers, faq and content by keyword', async () => {
    const r = await query('suite');
    expect(r.rooms.map((x) => x.id)).toContain('executive-suite');
    const b = await query('summer');
    expect(b.offers.length).toBeGreaterThan(0);
    const c = await query('check-in');
    expect(c.faq.length).toBeGreaterThan(0);
    const d = await query('restaurant');
    expect(d.content.some((x) => x.type === 'restaurant')).toBe(true);
    expect((await query('zzz')).rooms.length).toBe(0);
  });
});
