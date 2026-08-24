/** Anonymous browsing activity (recent searches + recently viewed rooms) — D-26.
    Client-side only (localStorage), API-ready: swap read/write for an HTTP client
    later without touching the UI. This is history, not search state (Rule 1). */

import { toISODate } from '@/lib/dates';

export interface RecentSearch {
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  rooms: number;
  at: number;
}

export interface RecentRoom {
  roomId: string;
  at: number;
}

export interface SearchSnapshot {
  checkin: Date | null;
  checkout: Date | null;
  adults: number;
  children: number;
  rooms: number;
}

const SEARCH_KEY = 'rc_recent_searches_v1';
const ROOM_KEY = 'rc_recent_rooms_v1';
const MAX = 8;

const isClient = typeof window !== 'undefined';

function read<T>(k: string): T[] {
  if (!isClient) return [];
  try {
    const v = JSON.parse(localStorage.getItem(k) ?? 'null');
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function write(k: string, v: unknown): void {
  if (!isClient) return;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* noop */
  }
}

function key(s: Omit<RecentSearch, 'at'>): string {
  return [s.checkin, s.checkout, s.adults, s.children, s.rooms].join('|');
}

export function recordSearch(s: SearchSnapshot): void {
  if (!s.checkin || !s.checkout) return;
  const rec: RecentSearch = {
    checkin: toISODate(s.checkin),
    checkout: toISODate(s.checkout),
    adults: s.adults,
    children: s.children,
    rooms: s.rooms,
    at: Date.now(),
  };
  const list = read<RecentSearch>(SEARCH_KEY).filter((r) => key(r) !== key(rec));
  list.unshift(rec);
  write(SEARCH_KEY, list.slice(0, MAX));
}

export function recentSearches(max = 3): RecentSearch[] {
  return read<RecentSearch>(SEARCH_KEY).slice(0, max);
}

export function recordRoomView(roomId: string): void {
  if (!roomId) return;
  const rec: RecentRoom = { roomId, at: Date.now() };
  const list = read<RecentRoom>(ROOM_KEY).filter((r) => r.roomId !== roomId);
  list.unshift(rec);
  write(ROOM_KEY, list.slice(0, MAX));
}

export function recentRoomIds(max = 3): string[] {
  return read<RecentRoom>(ROOM_KEY)
    .slice(0, max)
    .map((r) => r.roomId);
}
