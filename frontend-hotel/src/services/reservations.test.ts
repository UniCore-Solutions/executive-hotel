import { describe, expect, it } from 'vitest';
import { bookingKey, reservations } from '@/services/reservations';
import type { Reservation } from '@/types';

function monoReservation(): Reservation {
  return {
    ref: 'RC-UNITTEST',
    email: 'guest@unittest.dev',
    status: 'confirmed',
    checkedIn: false,
    createdAt: '2026-08-01',
    guest: {
      title: 'Mr',
      firstName: 'Unit',
      lastName: 'Test',
      email: 'guest@unittest.dev',
      phone: '+212 6 00 00 00 00',
      country: 'Morocco',
      arrival: '15:00',
      requests: '',
    },
    hotelId: 'executive-boutique-rabat',
    roomId: 'double-or-twin',
    planId: 'double-or-twin::bb',
    checkin: '2026-09-12',
    checkout: '2026-09-16',
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
      currency: 'MAD',
    },
  };
}

describe('reservations store', () => {
  it('seeds demo reservations once on first access', () => {
    const list = reservations.list();
    expect(list.some((r) => r.ref === 'RC-DEMO1')).toBe(true);
    expect(list.some((r) => r.ref === 'RC-DEMO2')).toBe(true);
    expect(reservations.list().length).toBe(list.length);
  });

  it('find matches ref+email case-insensitively', async () => {
    const r = reservations.find('rc-demo1', 'DEMO@HOTELCOLLECTION.COM');
    expect(r?.ref).toBe('RC-DEMO1');
    expect(reservations.find('RC-DEMO1', 'wrong@mail.com')).toBeNull();
  });

  it('byRef / byEmail', () => {
    expect(reservations.byRef('rc-demo2')?.email).toBe('guest@demo.com');
    expect(reservations.byEmail('GUEST@demo.com').length).toBe(1);
  });

  it('create unshifts a reservation with generated RC-XXXXXX ref', () => {
    const { ref: _omitted, ...payload } = monoReservation();
    void _omitted;
    const created = reservations.create(payload as never);
    expect(created.ref).toMatch(/^RC-[A-Z2-9]{6}$/);
    expect(created.status).toBe('confirmed');
    expect(created.checkedIn).toBe(false);
    expect(reservations.list()[0]?.ref).toBe(created.ref);
  });

  it('update patches and returns the row; unknown ref returns null', () => {
    const r = reservations.update('RC-DEMO1', { status: 'cancelled' });
    expect(r?.status).toBe('cancelled');
    expect(reservations.byRef('RC-DEMO1')?.status).toBe('cancelled');
    expect(reservations.update('RC-NOPE', {})).toBeNull();
  });

  it('setCheckedIn flips status and stamps date', () => {
    const r = reservations.setCheckedIn('RC-DEMO1');
    expect(r?.status).toBe('checked-in');
    expect(r?.checkedIn).toBe(true);
    expect(r?.checkedInAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('bookingKey', () => {
  it('begin returns a fresh key; finish stores it under rc_booking_done', () => {
    const item = 'room:double-or-twin:double-or-twin::bb:2026-09-12:2026-09-16';
    const { key, exitRef } = bookingKey.begin(item);
    expect(key).toMatch(/^bk-/);
    expect(exitRef).toBeNull();
    bookingKey.finish('RC-UNITTEST');
    const second = bookingKey.begin(item);
    expect(second.exitRef).toBe('RC-UNITTEST');
  });

  it('different items never exit-couple', () => {
    const item = 'room:x::bb:2026-01-01:2026-01-03';
    bookingKey.begin(item);
    bookingKey.finish('RC-FIRST');
    const other = bookingKey.begin(`${item}-other`);
    expect(other.exitRef).toBeNull();
  });

  it('clearDone resets the idempotency', () => {
    const item = 'room:y::bb:2026-01-01:2026-01-03';
    bookingKey.begin(item);
    bookingKey.finish('RC-Y');
    bookingKey.clearDone();
    expect(bookingKey.begin(item).exitRef).toBeNull();
  });
});
