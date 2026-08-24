'use client';

/* Cookie-policy preference panel — live wiring to the consent service so the
   "Change your choices" section works exactly like the footer banner dialog. */

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { get as getConsent, save as saveConsent } from '@/services/consent';
import { useToast } from '@/context/ToastContext';

export default function CookiesPanel() {
  const { toast } = useToast();
  const cur = getConsent();
  const [analytics, setAnalytics] = useState(cur.analytics);
  const [preferences, setPreferences] = useState(cur.preferences);
  const [line, setLine] = useState('');

  const saveChoices = () => {
    saveConsent({ analytics, preferences });
    setLine('Your cookie choices were saved.');
    toast({ message: 'Your cookie choices were saved.', type: 'ok' });
  };

  const rejectAll = () => {
    saveConsent({ analytics: false, preferences: false });
    setAnalytics(false);
    setPreferences(false);
    setLine('Analytics and preference cookies are now off.');
    toast({ message: 'Analytics and preference cookies are now off.', type: 'ok' });
  };

  return (
    <div className="border-navy/10 mt-8 space-y-4 rounded-3xl border bg-white p-6">
      <div className="flex items-center justify-between gap-4 py-2">
        <div>
          <p className="text-navy text-sm font-semibold">Essential</p>
          <p className="text-navy/50 mt-0.5 text-xs">
            Keeps search, booking and preferences working.
          </p>
        </div>
        <span className="text-navy/35 bg-paper rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase">
          Always on
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 py-2">
        <div>
          <p className="text-navy text-sm font-semibold">Analytics</p>
          <p className="text-navy/50 mt-0.5 text-xs">
            Anonymous usage statistics to improve the site.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center">
          <input
            id="pref-analytics"
            aria-label="Analytics"
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="peer sr-only"
          />
          <span className="bg-navy/15 peer-checked:bg-gold relative h-6 w-11 rounded-full transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5"></span>
        </label>
      </div>
      <div className="flex items-center justify-between gap-4 py-2">
        <div>
          <p className="text-navy text-sm font-semibold">Preferences</p>
          <p className="text-navy/50 mt-0.5 text-xs">
            Remembers your choices and shows more personal offers.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center">
          <input
            id="pref-marketing"
            aria-label="Preferences"
            type="checkbox"
            checked={preferences}
            onChange={(e) => setPreferences(e.target.checked)}
            className="peer sr-only"
          />
          <span className="bg-navy/15 peer-checked:bg-gold relative h-6 w-11 rounded-full transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5"></span>
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" onClick={saveChoices}>
          Save choices
        </Button>
        <Button type="button" onClick={rejectAll} variant="outline" className="bg-paper">
          Reject all
        </Button>
      </div>
      <p id="consent-line" className="min-h-5 text-sm font-medium" role="status">
        {line}
      </p>
    </div>
  );
}
