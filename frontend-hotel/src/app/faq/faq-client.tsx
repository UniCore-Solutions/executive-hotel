'use client';

import { useState } from 'react';

const TITLES: Record<string, string> = {
  stay: 'Stay',
  travel: 'Travel & arrival',
  wellness: 'Wellness',
  dining: 'Dining',
};

export interface FaqItem {
  question: string;
  answer: string;
  category: string | null;
}

export default function FaqClient({ faqs }: { faqs: FaqItem[] }) {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const groups = faqs.reduce<Record<string, FaqItem[]>>((acc, f) => {
    const key = f.category ?? 'general';
    (acc[key] ??= []).push(f);
    return acc;
  }, {});

  return (
    <>
      <div className="mt-6">
        <input
          id="faq-search"
          type="search"
          placeholder="Ask a question… e.g. parking, kids, cancellation"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-navy/15 focus:ring-gold/40 w-full rounded-2xl border bg-white px-5 py-3.5 text-sm font-medium focus:ring-2 focus:outline-none"
        />
      </div>

      <div id="faq-groups" className="mt-8 space-y-10">
        {Object.entries(groups).map(([key, items]) => {
          const title = TITLES[key] || key;
          const shown = items.filter(
            (f) => !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
          );
          if (!shown.length) return null;
          return (
            <section key={key} aria-label={title}>
              <h2 className="text-gold-dark mb-3 text-xs font-semibold tracking-[0.2em] uppercase">
                {title}
              </h2>
              <div className="space-y-2.5">
                {shown.map((f) => (
                  <details
                    key={f.question}
                    className="border-navy/10 group rounded-2xl border bg-white px-5 py-4"
                    data-faq
                  >
                    <summary className="text-navy hover:text-gold-dark flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold transition-colors">
                      <span>{f.question}</span>
                      <span className="text-gold-dark shrink-0 text-lg transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="text-navy/65 mt-3 text-sm leading-relaxed">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
