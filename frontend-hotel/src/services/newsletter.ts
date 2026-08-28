/** Newsletter — the backend has no subscription endpoint, so this is an
    honest "not available" state. No localStorage pretending, no canned
    success. */

export interface NewsletterResult {
  ok: boolean;
  message: string;
}

export async function subscribe(email: string, optedIn: boolean): Promise<NewsletterResult> {
  if (!String(email || '').includes('@'))
    return { ok: false, message: 'Enter a valid email address.' };
  if (!optedIn)
    return { ok: false, message: 'Please tick the box to consent to receiving our newsletter.' };
  return {
    ok: false,
    message: 'Newsletter sign-up is not available yet — please ask at the front desk.',
  };
}
