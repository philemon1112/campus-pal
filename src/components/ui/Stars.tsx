import { Star } from 'lucide-react';

// Shared star rating display + input. Used by the tour reviews list and the
// "rate your trip" form so both speak the same visual language.

const SIZES = { sm: 'size-3.5', md: 'size-4', lg: 'size-8' } as const;

export function Stars({
  value,
  size = 'md',
  className = '',
}: {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div className={`flex gap-0.5 ${className}`} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${SIZES[size]} ${
            i < Math.round(value)
              ? 'fill-accent-500 text-accent-500'
              : 'text-neutral-200 dark:text-neutral-700'
          }`}
        />
      ))}
    </div>
  );
}

// Interactive variant. Radio semantics rather than buttons so it's
// keyboard-navigable and announces as a single "Rating" control.
export function StarInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="flex gap-1">
      <legend className="sr-only">Rating</legend>
      {Array.from({ length: 5 }, (_, i) => {
        const rating = i + 1;
        return (
          <label key={rating} className="cursor-pointer">
            <input
              type="radio"
              name="rating"
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              className="sr-only peer"
            />
            <Star
              className={`size-8 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 ${
                rating <= value
                  ? 'fill-accent-500 text-accent-500'
                  : 'text-neutral-300 dark:text-neutral-700'
              }`}
            />
            <span className="sr-only">
              {rating} star{rating === 1 ? '' : 's'}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
