/* Homepage "in their words" section — curated approved reviews from the backend. */
import { Stars } from '@/components/ui/Stars';
import { formatDate } from '@/lib/format';
import type { HomepageReview } from '@/services/homepage';

function initials(name: string): string {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function FeaturedReviews({ reviews }: { reviews: HomepageReview[] }) {
  return (
    <div
      className="no-scrollbar snap-x-mandatory mt-10 flex gap-5 overflow-x-auto pb-2"
      role="region"
      aria-label="Guest reviews"
      tabIndex={0}
    >
      {reviews.map((rv) => (
        <article
          key={rv.id}
          className="snap-card border-navy/10 flex w-[85%] shrink-0 flex-col rounded-3xl border bg-white p-6 shadow-sm sm:w-[380px]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="bg-navy text-gold-light font-display flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
                {initials(rv.authorName ?? 'Guest')}
              </span>
              <div>
                <p className="text-navy text-sm font-semibold">{rv.authorName ?? 'Verified guest'}</p>
                <p className="text-navy/50 text-[11px]">Verified stay</p>
              </div>
            </div>
            <Stars rating={rv.rating} size="sm" />
          </div>
          {rv.title ? <h3 className="font-display text-navy mt-4 font-semibold">{rv.title}</h3> : null}
          <p className="text-navy/65 mt-1.5 text-sm">{rv.comment}</p>
          <p className="text-navy/40 mt-auto pt-4 text-[11px]">{formatDate(rv.createdAt)}</p>
        </article>
      ))}
    </div>
  );
}