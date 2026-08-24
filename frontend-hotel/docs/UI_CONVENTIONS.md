# UI Conventions (Next.js port)

Faithful port of the reference prototype (`hotel-html/`) to Next.js App Router.
Read this before writing any page. Reference files live at
`/home/hotel-executive/hotel-html/` (HTML + `src/*.js`).

## Stack

- Next.js App Router + Tailwind v4 (`@import "tailwindcss"` in globals.css; no tailwind.config).
- Design tokens in `src/app/globals.css` `@theme`: `--color-navy/-light/-dark`, `--color-gold/-light/-dark`, `--color-clay/-light`, `--color-paper`, `--color-ink`; fonts `--font-display` (Fraunces), `--font-sans` (Inter), `--font-script` (Cormorant italic).
- Utility classes like `bg-navy`, `text-gold-dark`, `font-display`, `bg-paper`, `text-ink`, `bg-navy/[0.04]` all exist.
- Domain data: `src/data/index.ts` (PROPERTY, OFFERS, EXTRAS, DEMO_RESERVATIONS). Services in `src/services/`. URL state helpers in `src/lib/dates.ts` (`readStateFromURL`, `stateToParams`, `stateToQuery`, `fromISODate`, `toISODate`, `fmtShort`, `fmt`, `guestsLabel`, `dateLabel`, `validateState`). Prices: `src/lib/format.ts` (`fmtPrice(mad, currency, {perNight})`).
- Search context: `src/context/SearchContext.tsx` (`useSearch()` → state, setDate, setGuests, setChildrenAges, setPromo, setCurrency, syncUrl, errors, sheetOpen/openSheet/closeSheet). Toasts: `useToast().toast({message, type: 'ok'|'error'|'info', title})`. Modal: `useModal().open(jsx)/close()`. Lang: `useLang()` → `{lang, setLang, t, langs}`.
- Layout shell (header + footer + search sheet + consent) is global in `src/app/layout.tsx` — pages never render their own header.
- Header theme: each page sets the body theme via a tiny client island: `<HeaderTheme theme="dark" />` (component: `src/components/layout/HeaderTheme.tsx`) — dark for image-hero pages (home, hotel), light elsewhere.
- Session: `useSession()` from `src/context/SessionContext.tsx`; auth service `src/services/auth.ts` (login/register demod).
- Real routes: `/`, `/hotel`, `/search`, `/offers`, `/room/[roomId]`, `/booking`, `/confirmation`, `/reservation`, `/checkin`, `/account`, `/faq`, `/contact`, `/terms`, `/privacy`, `/cookies`, `/cancellation-policy`.

## Page anatomy (light theme, e.g. FAQ)

```tsx
import type { Metadata } from 'next';
import HeaderTheme from '@/components/layout/HeaderTheme';

export const metadata: Metadata = {
  title: 'FAQ — Executive Boutique Hotel Rabat',
  description: '…',
};

export default function FaqPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Good to know
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Frequently asked questions
        </h1>
        …
      </div>
    </>
  );
}
```

- Content pages wrap content in `max-w-3xl`/`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 lg:pt-36 pb-20` (accounts for fixed header). Dark hero pages use the hero pattern from `index.html` (pt-28 lg:pt-40, bottom-aligned).
- Inner pages that are mostly text: `<div className="prose-like">` — just use existing utility classes; there is no typography plugin.
- Copy (headings, body, validation messages, toasts) MUST match the reference HTML/JS byte-for-byte. Escape nothing manually — React handles it.
- Links: Next routes (see stack). Section anchors: `/#rooms`, `/hotel#rooms`, `/hotel#experiences`, `/hotel#reviews`, `/#offers`. Tel link `tel:+212537278860`; display `+212 5 37 27 88 60`. Watch: faq.html used `+212 5 37 77 10 00` (different number in the reference CTA) — keep exactly.
- Interactive pieces: use `'use client'` islands. `<details>`/`<summary>` native accordions (no state needed). Forms validate client-side with the exact reference messages.
- Metadata: extended titles under 60 chars; description from reference `<meta description>`.
- Do NOT add comments to code unless the file header docblock already exists.
