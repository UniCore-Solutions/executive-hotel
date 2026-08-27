'use client';

/** Clamps long text to a fixed number of lines with a "Read more" toggle,
    instead of either a giant wall of text or an abrupt hard cut. Renders the
    text plainly (no toggle) when it already fits — no controls for a
    non-problem. */
import { useState } from 'react';

export function ReadMore({
  text,
  lines = 4,
  className = 'text-navy/70 text-[15px] leading-relaxed',
}: {
  text: string;
  lines?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  // A rough heuristic (~90 chars/line) to decide whether the toggle is worth
  // showing at all — avoids a "Read more" link under text that already fits.
  const likelyOverflows = text.length > lines * 90;

  return (
    <div>
      <p
        className={className}
        style={
          expanded || !likelyOverflows
            ? undefined
            : {
                display: '-webkit-box',
                WebkitLineClamp: lines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
        }
      >
        {text}
      </p>
      {likelyOverflows ? (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-navy hover:text-gold-dark mt-2 text-sm font-semibold underline decoration-navy/30 underline-offset-4 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}
