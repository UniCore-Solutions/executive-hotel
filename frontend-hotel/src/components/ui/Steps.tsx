/** Progress stepper */
interface StepsProps {
  steps: string[];
  current: number;
  className?: string;
}

export function Steps({ steps, current, className = '' }: StepsProps) {
  return (
    <ol className={`flex items-center gap-2 ${className}`} aria-label="Booking progress">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < current ? 'bg-emerald-600 text-white' : i === current ? 'bg-navy text-white' : 'bg-navy/10 text-navy/50'}`}
          >
            {i < current ? (
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          <span
            className={`ml-2 hidden text-sm font-medium sm:block ${i <= current ? 'text-navy' : 'text-navy/50'}`}
          >
            {step}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 max-w-24 flex-1 ${i < current ? 'bg-emerald-600' : 'bg-navy/10'}`}
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
