'use client';

/* Newsletter signup (FORM-4) — consent checkbox gates the submit; success shows
   the service message + toast; failures surface inline in red. */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { subscribe } from '@/services/newsletter';
import { useToast } from '@/context/ToastContext';

export default function NewsletterForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await subscribe(email.trim(), consent);
    if (res.ok) {
      setStatus({ text: res.message, ok: true });
      setEmail('');
      setConsent(false);
      setBusy(false);
      toast({
        message: 'Welcome to the collection — WELCOME5 is ready when you are.',
        type: 'ok',
        title: 'Subscribed',
      });
    } else {
      setStatus({ text: res.message, ok: false });
      setBusy(false);
    }
  };

  return (
    <form
      id="newsletter-form"
      className="mx-auto mt-8 max-w-xl text-left"
      onSubmit={submit}
      noValidate
    >
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          type="email"
          id="nl-email"
          size="sm"
          required
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 bg-white px-4"
          aria-label="Email address"
        />
        <Button type="submit" id="nl-submit" disabled={!consent || busy} className="shadow-navy/20">
          Subscribe
        </Button>
      </div>
      <label className="text-navy/60 mt-3 flex cursor-pointer items-start gap-2.5 text-xs">
        <input
          type="checkbox"
          id="nl-consent"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="accent-navy mt-0.5"
        />
        <span>
          I consent to receiving the Executive Boutique Hotel Rabat newsletter by email. Unsubscribe
          any time.{' '}
          <a href="/privacy" className="underline">
            Privacy notice
          </a>
          .
        </span>
      </label>
      <p
        id="nl-status"
        className={`mt-3 min-h-5 text-sm font-medium ${status ? (status.ok ? 'text-emerald-700' : 'text-clay') : ''}`}
        role="status"
      >
        {status?.text ?? ''}
      </p>
    </form>
  );
}
