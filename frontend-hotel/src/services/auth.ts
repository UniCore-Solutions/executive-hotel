/** Mocked auth — port of RC.auth (mock.js), exact messages. */
import type { Session, User } from '@/types';

const LS = { users: 'rc_users_v1', session: 'rc_session_v1' } as const;
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

export interface AuthResult {
  ok: boolean;
  message?: string;
  user?: { email: string; name: string };
}

export function seedUsers(): User[] {
  const u = read<User[]>(LS.users, []);
  if (!u.some((x) => x.email === 'demo@hotelcollection.com')) {
    u.push({ email: 'demo@hotelcollection.com', name: 'Adam Benali', password: 'demo1234' });
    write(LS.users, u);
  }
  return u;
}

export function session(): Session | null {
  return read<Session | null>(LS.session, null);
}

export function isLoggedIn(): boolean {
  return !!session();
}

export async function login(email: string, password: string): Promise<AuthResult> {
  await delay(500);
  const users = seedUsers();
  const e = String(email || '')
    .trim()
    .toLowerCase();
  const u = users.find((x) => x.email === e && x.password === String(password || ''));
  if (!u) return { ok: false, message: 'Incorrect email or password.' };
  write(LS.session, { email: u.email, name: u.name, at: Date.now() });
  return { ok: true, user: { email: u.email, name: u.name } };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  await delay(500);
  const users = seedUsers();
  const e = String(input.email || '')
    .trim()
    .toLowerCase();
  if (users.some((x) => x.email === e))
    return { ok: false, message: 'An account with this email already exists. Sign in instead.' };
  users.push({
    email: e,
    name: String(input.name || '').trim(),
    password: String(input.password || ''),
  });
  write(LS.users, users);
  write(LS.session, { email: e, name: String(input.name || '').trim(), at: Date.now() });
  return { ok: true, user: { email: e, name: String(input.name || '').trim() } };
}

export async function reset(email: string): Promise<AuthResult> {
  await delay(600);
  return email && String(email).includes('@')
    ? {
        ok: true,
        message: 'If an account exists for this email, a reset link has been sent (mock).',
      }
    : { ok: false, message: 'Enter a valid email address.' };
}

export function logout(): void {
  try {
    localStorage.removeItem(LS.session);
  } catch {
    /* noop */
  }
}
