'use client';

import { useLayoutEffect } from 'react';

/** Sets the header theme (dark over image heroes, light elsewhere). */
export default function HeaderTheme({ theme }: { theme: 'dark' | 'light' }) {
  useLayoutEffect(() => {
    document.body.dataset.headerTheme = theme;
    return () => {
      delete document.body.dataset.headerTheme;
    };
  }, [theme]);
  return null;
}
