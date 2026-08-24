'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface ToastInput {
  message: string;
  type?: 'ok' | 'error' | 'info';
  title?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

export interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<'ok' | 'error' | 'info', { cls: string; symbol: string; ttl: number }> = {
  ok: { cls: 'bg-emerald-700', symbol: '✓', ttl: 4200 },
  error: { cls: 'bg-clay', symbol: '✕', ttl: 6000 },
  info: { cls: 'bg-navy', symbol: 'i', ttl: 4200 },
};

function toastCfg(type?: string) {
  return ICONS[type as 'ok' | 'error' | 'info'] || ICONS.info;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, type = 'ok', title = '' }: ToastInput) => {
      const id = ++idRef.current;
      const cfg = toastCfg(type);
      const ttl = cfg.ttl;
      setItems((list) => [...list, { id, message, type, title }]);
      window.setTimeout(() => dismiss(id), ttl);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite">
        {items.map((t) => {
          const cfg = toastCfg(t.type);
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => dismiss(t.id)}
              className={`fixed right-5 bottom-5 z-[90] w-[calc(100vw-2.5rem)] max-w-sm sm:w-auto ${cfg.cls} animate-rise flex cursor-pointer items-start gap-3 rounded-2xl px-5 py-4 text-white shadow-2xl shadow-black/20`}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {cfg.symbol}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title || t.message}</p>
                {t.title ? <p className="mt-0.5 text-xs text-white/85">{t.message}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
