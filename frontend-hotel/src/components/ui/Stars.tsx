/** Stars component */
interface StarsProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STAR_SVG = (
  <svg viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 1.5 12.6 7l6 .6-4.5 4 1.3 5.9L10 14.4 4.6 17.5 6 11.6 1.5 7.6l6-.6L10 1.5Z" />
  </svg>
);

export function Stars({ rating, size = 'md', className = '' }: StarsProps) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-4.5 h-4.5', lg: 'w-5 h-5' };
  const filled = Math.round(rating);
  return (
    <div
      role="img"
      className={`inline-flex gap-0.5 ${className}`}
      aria-label={`${rating} out of 5 stars`}
    >
      {[...Array(5)].map((_, i) => (
        <span key={i} className={`text-gold ${i < filled ? '' : 'text-navy/20'} ${sizes[size]}`}>
          {STAR_SVG}
        </span>
      ))}
    </div>
  );
}
