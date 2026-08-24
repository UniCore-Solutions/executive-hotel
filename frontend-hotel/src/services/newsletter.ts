/** Newsletter mock (FORM-4) — port of RC.newsletter (mock.js), exact messages. */
const KEY = 'rc_newsletter_v1';
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

export interface NewsletterResult {
  ok: boolean;
  message: string;
}

export async function subscribe(email: string, optedIn: boolean): Promise<NewsletterResult> {
  await delay(400);
  if (!String(email || '').includes('@'))
    return { ok: false, message: 'Enter a valid email address.' };
  if (!optedIn)
    return { ok: false, message: 'Please tick the box to consent to receiving our newsletter.' };
  const list = read<string[]>(KEY, []);
  if (!list.includes(email)) list.push(email);
  write(KEY, list);
  return {
    ok: true,
    message: 'Almost done — check your inbox to confirm your subscription (double opt-in, mocked).',
  };
}
