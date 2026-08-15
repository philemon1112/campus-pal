import { CheckCircle2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError, reviewsApi } from '@/lib/api';
import { StarInput, Stars } from '@/components/ui/Stars';

// POST /bookings/:reference/review. The API only accepts a review for a
// booking whose status is COMPLETED (i.e. the trip actually happened), so
// BookingDetailPage only renders this in that state — there's no point
// offering a form that can only 400.
//
// Posting also updates the tour's ratingAvg/ratingCount, which is why the
// tour page's summary changes after this succeeds.
const MIN_BODY = 3;
const MAX_BODY = 2000;

export function WriteReview({ reference }: { reference: string }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ rating: number; body: string } | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError('Pick a star rating first.');
      return;
    }
    const trimmed = body.trim();
    if (trimmed.length < MIN_BODY) {
      setError(`Tell us a little more — at least ${MIN_BODY} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    reviewsApi.createReview$(reference, { rating, body: trimmed }).subscribe({
      next: (review) => {
        setSubmitting(false);
        setSubmitted({ rating: review.rating, body: review.body });
      },
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not post your review.');
        setSubmitting(false);
      },
    });
  }

  if (submitted) {
    return (
      <section className="mt-5 rounded-card border border-brand-500/30 bg-brand-50 p-4 dark:bg-brand-700/15">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-brand-600" />
          <h2 className="font-semibold text-ink-900 dark:text-white">Thanks for your review</h2>
        </div>
        <Stars value={submitted.rating} className="mt-3" />
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {submitted.body}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-card border border-neutral-100 p-4 dark:border-neutral-800">
      <h2 className="font-semibold text-ink-900 dark:text-white">How was your trip?</h2>
      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        Your review helps other travellers choose.
      </p>

      <form onSubmit={handleSubmit} className="mt-4">
        <StarInput value={rating} onChange={setRating} disabled={submitting} />

        <label
          htmlFor="review-body"
          className="mb-1.5 mt-4 block text-sm font-medium text-ink-900 dark:text-white"
        >
          Your review
        </label>
        <textarea
          id="review-body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_BODY}
          placeholder="What stood out? Anything the next traveller should know?"
          className="w-full resize-y rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
        />
        <p className="mt-1 text-right text-xs text-neutral-400">
          {body.length}/{MAX_BODY}
        </p>

        {error && <p className="mt-2 text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-3 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Posting…' : 'Post review'}
        </button>
      </form>
    </section>
  );
}
