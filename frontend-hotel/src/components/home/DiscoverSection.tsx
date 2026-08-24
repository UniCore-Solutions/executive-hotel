/* "Discover new ways to stay" — what the hotel offers: services and amenities
   (restaurant, breakfast, parking, business centre…), not the room list (D-29).
   `variant="image"` renders directly on the hero image (no background, white
   title, frosted cards); the default variant is the in-flow paper section.
   Shared by the homepage and the /index-2 variant (D-27). */

import { PROPERTY } from '@/data';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/constants/icons';

const P = PROPERTY;

const SUBTITLE =
  'From the on-site restaurant to the business centre, discover everything the hotel offers for a comfortable stay.';

export default function DiscoverSection({
  variant = 'section',
}: {
  variant?: 'image' | 'section';
}) {
  const onImage = variant === 'image';

  return (
    <section
      className={onImage ? 'mt-10 lg:mt-14' : 'bg-paper border-navy/10 border-y'}
      aria-labelledby="discover-title"
    >
      <div className={onImage ? '' : 'mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24'}>
        <div className={onImage ? 'max-w-2xl' : 'max-w-2xl'}>
          <p
            className={`eyebrow text-[11px] font-semibold tracking-[0.3em] uppercase ${
              onImage ? 'text-gold-light' : 'text-gold-dark'
            }`}
          >
            Discover
          </p>
          <p
            id="discover-title"
            className={`font-display mt-2 text-2xl font-semibold sm:text-3xl ${
              onImage ? 'text-white' : 'text-navy'
            }`}
          >
            Discover new ways to stay
          </p>
          <p className={`mt-3 text-sm sm:text-base ${onImage ? 'text-white/80' : 'text-navy/65'}`}>
            {SUBTITLE}
          </p>
        </div>
        <ul
          className={`mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 ${
            onImage ? '' : 'mt-10'
          }`}
        >
          {P.facilities.map((f) => (
            <li
              key={f.name}
              className={
                onImage
                  ? 'rounded-3xl border border-white/40 bg-white/90 p-5 shadow-lg backdrop-blur'
                  : 'border-navy/10 flex flex-col rounded-3xl border bg-white p-5 shadow-sm'
              }
            >
              <Icon name={f.icon as IconName} className="text-gold-dark h-6 w-6" />
              <p className="text-navy mt-3 font-semibold">{f.name}</p>
              <p className="text-navy/65 mt-1 text-sm leading-relaxed">{f.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
