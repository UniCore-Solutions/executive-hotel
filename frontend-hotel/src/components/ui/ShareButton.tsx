'use client';

/** Copies the current page URL, matching the same clipboard+toast pattern
    already used by ConfirmationFlow's "Share confirmation" action. A real,
    working action — not a decorative icon. */
import { useToast } from '@/context/ToastContext';

export function ShareButton({ label = 'Share', className = '' }: { label?: string; className?: string }) {
  const { toast } = useToast();

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ message: 'Link copied to your clipboard.', type: 'ok', title: 'Link copied' });
    } catch {
      toast({ message: 'Could not copy the link — copy it from the address bar.', type: 'info' });
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className={`text-navy/70 hover:text-navy hover:bg-navy/5 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          d="M8.5 12.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Zm0 0-1 .5m1-.5 6.5 3.5m-6.5-8 6.5-3.5M15 6a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Zm0 12a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z"
        />
      </svg>
      {label}
    </button>
  );
}
