'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { get as getConsent, save as saveConsent } from '@/services/consent';
import { useToast } from '@/context/ToastContext';
import { useModal } from '@/context/ModalContext';

/** Cookie-settings dialog content — port of RC.showConsentDialog (common.js). */
export default function ConsentDialog() {
  const { toast } = useToast();
  const { close } = useModal();
  const cur = getConsent();
  const [analytics, setAnalytics] = useState(cur.analytics);
  const [preferences, setPreferences] = useState(cur.preferences);

  const save = () => {
    saveConsent({ analytics, preferences });
    toast({ message: 'Your cookie choices were saved.', type: 'ok' });
    close();
  };

  return (
    <>
      <h2 className="font-display text-navy text-xl font-semibold">Cookie settings</h2>
      <p className="text-navy/60 mt-2 text-sm">
        Choose which cookies we may use. Your choice is stored on this device only.
      </p>
      <div className="mt-5 space-y-3">
        <label className="bg-paper flex items-start gap-3 rounded-2xl p-3">
          <input type="checkbox" checked disabled className="accent-navy mt-1" />
          <span>
            <span className="text-navy block text-sm font-semibold">Essential</span>
            <span className="text-navy/55 block text-xs">
              Required for the site to function (search, booking, preferences).
            </span>
          </span>
        </label>
        <label className="bg-paper flex items-start gap-3 rounded-2xl p-3">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="accent-navy mt-1"
          />
          <span>
            <span className="text-navy block text-sm font-semibold">Analytics</span>
            <span className="text-navy/55 block text-xs">
              Anonymous usage statistics. No tags are installed in this prototype.
            </span>
          </span>
        </label>
        <label className="bg-paper flex items-start gap-3 rounded-2xl p-3">
          <input
            type="checkbox"
            checked={preferences}
            onChange={(e) => setPreferences(e.target.checked)}
            className="accent-navy mt-1"
          />
          <span>
            <span className="text-navy block text-sm font-semibold">Preferences</span>
            <span className="text-navy/55 block text-xs">
              Remember currency, language and recent searches.
            </span>
          </span>
        </label>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <Button type="button" onClick={close} variant="ghost" size="sm" className="px-4">
          Close
        </Button>
        <Button type="button" onClick={save} size="sm">
          Save choices
        </Button>
      </div>
    </>
  );
}
