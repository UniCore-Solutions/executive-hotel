'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useToast } from '@/context/ToastContext';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ContactForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [line, setLine] = useState<{ text: string; ok: boolean } | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    const msg = message.trim();
    if (!EMAIL_RE.test(em)) {
      setLine({ text: 'Enter a valid email address.', ok: false });
      return;
    }
    if (msg.length < 10) {
      setLine({ text: 'Tell us a little more (min. 10 characters).', ok: false });
      return;
    }
    setLine({
      text: 'Message ready — in production this would reach our team. You can also call +212 5 37 27 88 60.',
      ok: true,
    });
    toast({ message: 'Thank you — we read every message.', type: 'ok', title: 'Message noted' });
  };

  return (
    <form onSubmit={onSubmit} className="border-navy/10 rounded-3xl border bg-white p-6" noValidate>
      <h2 className="font-display text-navy text-xl font-semibold">Send a message</h2>
      <div className="mt-5 grid gap-4">
        <div>
          <Label htmlFor="c-email">Email *</Label>
          <Input
            id="c-email"
            type="email"
            size="sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="c-subject">Subject *</Label>
          <select
            id="c-subject"
            className="bg-paper border-navy/15 focus:ring-gold/40 w-full rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
          >
            <option>Before I arrive</option>
            <option>My booking</option>
            <option>Transfers &amp; getting here</option>
            <option>Cancellation or changes</option>
            <option>Something else</option>
          </select>
        </div>
        <div>
          <Label htmlFor="c-msg">Message *</Label>
          <textarea
            id="c-msg"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-paper border-navy/15 focus:ring-gold/40 w-full resize-none rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
          />
        </div>
        <p
          role="status"
          className={`min-h-5 text-sm font-medium ${line ? (line.ok ? 'text-emerald-700' : 'text-clay') : ''}`}
        >
          {line ? line.text : ''}
        </p>
        <Button type="submit" className="shadow-navy/15 py-3.5">
          Send message
        </Button>
        <p className="text-navy/40 text-[11px]">Prototype: messages are not sent anywhere.</p>
      </div>
    </form>
  );
}
