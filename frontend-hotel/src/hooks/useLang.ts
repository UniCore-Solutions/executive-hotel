/** Language/RTL hook — port of RC.lang / RC.setLang / RC.t (common.js). */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LangCode } from '@/types';
import { LANGS, translate } from '@/constants/i18n';

export function useLang() {
  const [lang, setLangState] = useState<LangCode>('en');

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const v = localStorage.getItem('rc_lang');
        if (v === 'fr' || v === 'ar' || v === 'en') setLangState(v);
      } catch {
        /* noop */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onLang = (e: Event) => {
      const code = (e as CustomEvent<LangCode>).detail;
      if (code === 'fr' || code === 'ar' || code === 'en') setLangState(code);
    };
    window.addEventListener('rc:lang', onLang);
    return () => window.removeEventListener('rc:lang', onLang);
  }, []);

  const setLang = useCallback((code: LangCode) => {
    try {
      localStorage.setItem('rc_lang', code);
    } catch {
      /* noop */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = code;
      document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    }
    setLangState(code);
    window.dispatchEvent(new CustomEvent<LangCode>('rc:lang', { detail: code }));
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [lang]);

  const t = useCallback((key: string) => translate(lang, key), [lang]);

  return { lang, setLang, t, langs: LANGS };
}
