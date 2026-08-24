/** Site search (site-level) — port of RC.siteSearch (mock.js). */
import { DATA } from '@/data';
import type { SiteSearchResult } from '@/types';

export function query(q: string): Promise<SiteSearchResult> {
  const qq = String(q || '')
    .trim()
    .toLowerCase();
  const out: SiteSearchResult = { rooms: [], offers: [], faq: [], content: [] };
  if (!qq) return Promise.resolve(out);
  const has = (s: string) =>
    String(s || '')
      .toLowerCase()
      .includes(qq);
  DATA.PROPERTY.rooms.forEach((r) => {
    if (has(r.name) || has(r.description) || has(r.amenities.join(' '))) out.rooms.push(r);
  });
  DATA.OFFERS.forEach((o) => {
    if (has(o.title) || has(o.desc) || has(o.code)) out.offers.push(o);
  });
  (Object.keys(DATA.PROPERTY.faq) as Array<keyof typeof DATA.PROPERTY.faq>).forEach((topic) => {
    DATA.PROPERTY.faq[topic].forEach((f) => {
      if (has(f.q) || has(f.a)) out.faq.push({ ...f, topic });
    });
  });
  DATA.PROPERTY.restaurants.forEach((r) => {
    if (has(r.name)) out.content.push({ type: 'restaurant', name: r.name });
  });
  DATA.PROPERTY.experiences.forEach((e) => {
    if (has(e.name)) out.content.push({ type: 'experience', name: e.name });
  });
  return Promise.resolve(out);
}
