/** Reservation store (localStorage) + booking idempotency key — port of mock.js. */
import { DATA } from '@/data';
import type { Reservation } from '@/types';
import { toISODate } from '@/lib/dates';

const LS = {
  res: 'rc_reservations_v1',
  session: 'rc_session_v1',
} as const;

export const BOOKING_DONE_KEY = 'rc_booking_done';

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
    /* storage unavailable */
  }
}

const REF_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function genRef(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += REF_CHARS[Math.floor(Math.random() * REF_CHARS.length)];
  return `RC-${s}`;
}

function seedStore(): Reservation[] {
  const existing = read<Reservation[]>(LS.res, []);
  if (existing.length) return existing;
  const seeds: Reservation[] = DATA.DEMO_RESERVATIONS.map((d) => ({ ...d, demo: true }));
  write(LS.res, seeds);
  return seeds;
}

export type CreateReservation = Omit<Reservation, 'ref' | 'status' | 'checkedIn' | 'createdAt'> &
  Partial<Pick<Reservation, 'status' | 'checkedIn' | 'createdAt'>>;

export const reservations = {
  list(): Reservation[] {
    return seedStore();
  },

  save(list: Reservation[]): void {
    write(LS.res, list);
  },

  find(ref: string, email: string): Reservation | null {
    const r = String(ref || '')
      .trim()
      .toUpperCase();
    const e = String(email || '')
      .trim()
      .toLowerCase();
    return (
      seedStore().find(
        (x) => String(x.ref || '').toUpperCase() === r && String(x.email || '').toLowerCase() === e
      ) || null
    );
  },

  byRef(ref: string): Reservation | null {
    return (
      seedStore().find(
        (x) =>
          String(x.ref || '').toUpperCase() ===
          String(ref || '')
            .trim()
            .toUpperCase()
      ) || null
    );
  },

  byEmail(email: string): Reservation[] {
    return seedStore().filter(
      (x) =>
        String(x.email || '').toLowerCase() ===
        String(email || '')
          .trim()
          .toLowerCase()
    );
  },

  create(data: CreateReservation): Reservation {
    const list = seedStore();
    const reservation = {
      ref: genRef(),
      status: 'confirmed',
      checkedIn: false,
      createdAt: toISODate(new Date()),
      ...data,
    } as Reservation;
    list.unshift(reservation);
    write(LS.res, list);
    return reservation;
  },

  update(ref: string, patch: Partial<Reservation>): Reservation | null {
    const list = seedStore();
    const i = list.findIndex((x) => x.ref.toUpperCase() === String(ref).trim().toUpperCase());
    const current = i < 0 ? null : (list[i] ?? null);
    if (!current) return null;
    const next = { ...current, ...patch } as Reservation;
    list[i] = next;
    write(LS.res, list);
    return next;
  },

  setCheckedIn(ref: string, flag = true): Reservation | null {
    return reservations.update(ref, {
      checkedIn: flag,
      checkedInAt: flag ? toISODate(new Date()) : null,
      status: 'checked-in',
    });
  },
};

/* ============ booking idempotency key (BOOK-7) ============ */
const BK_KEY: { key: string; item: string; finished: boolean } = {
  key: '',
  item: '',
  finished: false,
};

export const bookingKey = {
  begin(item: string): { key: string; exitRef: string | null } {
    BK_KEY.item = item;
    BK_KEY.key = `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    BK_KEY.finished = false;
    const done = read<{ item: string; key: string; ref: string; at: number } | null>(
      BOOKING_DONE_KEY,
      null
    );
    if (done && done.item === item && Date.now() - done.at < 30 * 60 * 1000) {
      BK_KEY.finished = true;
      return { key: done.key, exitRef: done.ref };
    }
    return { key: BK_KEY.key, exitRef: null };
  },

  get(): { key: string; item: string; finished: boolean } {
    return BK_KEY;
  },

  finish(ref: string): void {
    write(BOOKING_DONE_KEY, { key: BK_KEY.key, item: BK_KEY.item, ref, at: Date.now() });
  },

  clearDone(): void {
    try {
      localStorage.removeItem(BOOKING_DONE_KEY);
    } catch {
      /* noop */
    }
  },
};

export { read as storageRead, write as storageWrite };
