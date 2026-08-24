'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get as getConsent, save as saveConsent } from '@/services/consent';
import { useModal } from '@/context/ModalContext';
import ConsentDialog from '@/components/layout/ConsentDialog';

/** Consent banner — port of RC.mountConsent (common.js, ANA-1). */
export default function ConsentManager() {
  const [visible, setVisible] = useState(false);
  const { open } = useModal();

  useEffect(() => {
    const t = setTimeout(() => setVisible(!getConsent().chosen), 0);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const acceptAll = () => {
    saveConsent({ analytics: true, preferences: true });
    setVisible(false);
  };
  const essentialOnly = () => {
    saveConsent({ analytics: false, preferences: false });
    setVisible(false);
  };
  const customise = () => {
    open(<ConsentDialog />);
    setVisible(false);
  };

  return (
    <div
      id="consent-banner"
      className="bg-navy-dark border-gold/20 fixed inset-x-0 bottom-0 z-[80] border-t text-white shadow-2xl"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center">
        <div className="flex-1 text-sm text-white/80">
          <p className="font-semibold text-white">Your privacy</p>
          <p className="mt-0.5 text-xs text-white/60">
            We use cookies to make the site work and, with your consent, to understand how it is
            used. See our{' '}
            <Link href="/cookies" className="text-gold-light underline">
              cookie policy
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={customise}
            variant="ghost"
            className="px-2 py-2 text-inherit underline underline-offset-2"
          >
            Customise
          </Button>
          <Button
            type="button"
            onClick={essentialOnly}
            variant="onDark"
            size="sm"
            className="rounded-full px-4 text-white/70 hover:text-white"
          >
            Essential only
          </Button>
          <Button
            type="button"
            onClick={acceptAll}
            variant="gold"
            size="sm"
            className="rounded-full"
          >
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
