import { RefreshCw } from 'lucide-react';
import { reviewsApi } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Stars } from '@/components/ui/Stars';
import { SkeletonLine, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/format';

// Reviews for one tour (GET /tours/:id/reviews). Rendered inside
// TourDetailPage, below the departures.
//
// ⚠️ The API's ReviewResponseDto carries `authorId` but **no author name or
// avatar**, so there is deliberately no reviewer identity shown here — the
// alternative would be inventing one. If the backend adds `author`, drop it
// into the card header. See docs/API_STATUS.md.
export function TourReviews({
  tourId,
  ratingAvg,
  ratingCount,
}: {
  tourId: string;
  ratingAvg: number;
  ratingCount: number;
}) {
  const { data, status, retry } = useApiResource(() => reviewsApi.listTourReviews$(tourId));
  const reviews = data?.results ?? [];

  return (
    <section className="mt-8">
      {/* Heading and the rating summary come from the tour itself, so they
          render immediately — only the list below waits. */}
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-ink-900 dark:text-white">Reviews</h2>
        {ratingCount > 0 && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>

      {ratingCount > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800">
          <span className="text-3xl font-bold text-ink-900 dark:text-white">
            {ratingAvg.toFixed(1)}
          </span>
          <div>
            <Stars value={ratingAvg} />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Average of {ratingCount} {ratingCount === 1 ? 'review' : 'reviews'}
            </p>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <SkeletonRegion label="Loading reviews" className="space-y-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={i}
              className="rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <SkeletonLine className="w-24" />
                <SkeletonLine className="w-20" />
              </div>
              <SkeletonText lines={2} className="mt-2" />
            </div>
          ))}
        </SkeletonRegion>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span>Couldn't load reviews.</span>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {status === 'ready' && reviews.length === 0 && (
        <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-800">
          No reviews yet — travellers can review a tour once their trip is complete.
        </p>
      )}

      {status === 'ready' && reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between gap-3">
                <Stars value={review.rating} size="sm" />
                <span className="text-xs text-neutral-400">{formatDate(review.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {review.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
