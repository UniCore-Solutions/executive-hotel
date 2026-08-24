/** Shared inline SVG icon — renders a named glyph from constants/icons.ts with
    the exact stroke conventions used across the app (1.8 stroke, currentColor). */
import { cn } from '@/lib/utils';
import { ICON_PATHS, type IconName } from '@/constants/icons';

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4', className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={ICON_PATHS[name]} />
    </svg>
  );
}
