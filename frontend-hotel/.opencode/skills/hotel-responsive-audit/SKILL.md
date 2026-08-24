---
name: hotel-responsive-audit
description: How to audit responsive behavior of the hotel app — viewport list, what to check per component, and how to record findings. Use when doing responsive QA or fixing layout bugs.
---

# Responsive audit procedure (hotel app)

## Viewports

320, 360, 390, 430 (mobile), 768 (tablet), 1024, 1280, 1440+ (desktop).

## Components to verify at every breakpoint

- Header: utility bar wraps? nav hidden on mobile? hamburger opens menu? dark-theme hero transitions to frosted paper on scroll?
- Search widget: desktop segmented bar ↔ mobile pill (opens bottom sheet); calendar in sheet is full-width; steppers usable; promo editor not clipped.
- Sticky dock (home page only): appears after scrolling past 55% of hero; `Edit stay` opens sheet (mobile) or `/search` (desktop).
- Room page: booking card sticky below 1024; stay strip segments stack; date picker becomes bottom sheet < 640; thumbs rail scrollable.
- Booking pages: 2-column grid collapses; step labels hidden on mobile; payment fields fill width; `w-[calc(100vw-2.5rem)]` toast fits 320 px.
- Cards: grids collapse 3→2→1; text never truncates mid-word awkwardly; price rows don't overflow.
- Consent banner: buttons stack or wrap on 320 px; never covers the whole viewport.

## Checks

No horizontal overflow (`document.documentElement.scrollWidth > innerWidth`), no clipped buttons (`getBoundingClientRect` edges > viewport), no overlapping fixed elements (sticky dock vs consent banner vs sheet), text contrast ≥ 4.5:1, focus visible on keyboard nav.

## Recording

Report: `page, viewport, element/selector, issue, severity (blocker/major/minor), fix`. Screenshot filenames into `/tmp/opencode/visual-qa/`.
