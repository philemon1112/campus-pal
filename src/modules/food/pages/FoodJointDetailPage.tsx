import {
  ChevronLeft,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RefreshCw,
  Star,
  Utensils,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  ApiError,
  foodJointsApi,
  getTokens,
  type FoodJoint,
  type MenuSection,
  type Review,
} from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import {
  Skeleton,
  SkeletonChip,
  SkeletonLine,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/Skeleton';
import { Stars, StarInput } from '@/components/ui/Stars';
import { SaveButton } from '@/components/ui/SaveButton';
import { ActionLink } from '@/components/ui/ActionLink';
import { formatMoney, formatDate, priceTierLabel } from '@/lib/format';
import { directionsUrl } from '@/lib/geo';
import { ROUTES } from '@/lib/routes';

const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// One food joint — SRS FR-2.3 (details, hours, contact, menu), FR-2.4
// (contact action), FR-2.5 (map + directions), FR-2.8 (rate and review).
//
// There is deliberately no reservation flow. The API this was forked from
// has a working table-booking vertical, but the CampusPal SRS specifies a
// directory with a Contact action and never mentions reservations, so those
// endpoints simply go uncalled. See docs/API_REQUIREMENTS.md §E.

const tabs = ['Menu', 'Reviews', 'Info'] as const;
type Tab = (typeof tabs)[number];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function MenuTab({ sections }: { sections: MenuSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-800">
        No menu published yet.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.category}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {section.category}
          </h3>
          <div className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800">
            {section.items.map((item, i) => (
              <div
                key={item.name}
                className={`flex items-start justify-between gap-4 px-4 py-3 ${
                  i !== section.items.length - 1
                    ? 'border-b border-neutral-100 dark:border-neutral-800'
                    : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 dark:text-white">{item.name}</p>
                  {item.description && (
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-semibold text-ink-900 dark:text-white">
                  {formatMoney(item.priceMinor, 'GHS')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// FR-2.8. The endpoints don't exist yet, so a failed list is reported as
// "not available" rather than as a fault the user could retry away.
function ReviewsTab({ jointId }: { jointId: string }) {
  const idRef = useRef(jointId);
  idRef.current = jointId;

  const { data, status, retry } = useApiResource(() => foodJointsApi.listReviews$(idRef.current));

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const signedIn = getTokens() !== null;
  const reviews: Review[] = data?.results ?? [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) return setPostError('Pick a rating first.');
    setPosting(true);
    setPostError(null);
    foodJointsApi.createReview$(idRef.current, { rating, body }).subscribe({
      next: () => {
        setPosted(true);
        setPosting(false);
        setRating(0);
        setBody('');
        retry();
      },
      error: (err: unknown) => {
        setPostError(
          err instanceof ApiError && err.code === 404
            ? 'Reviews aren’t built on the backend yet.'
            : err instanceof ApiError
              ? err.message
              : 'Could not post that review.',
        );
        setPosting(false);
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* The form is static chrome — it renders regardless of whether the
          list loaded. */}
      <form onSubmit={submit} className="rounded-card border border-neutral-100 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Been here?</h3>
        {signedIn ? (
          <>
            <div className="mt-2">
              <StarInput value={rating} onChange={setRating} disabled={posting} />
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="How was the food?"
              aria-label="Your review"
              className="mt-3 w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
            />
            {postError && <p className="mt-2 text-sm text-danger-500">{postError}</p>}
            {posted && <p className="mt-2 text-sm text-brand-600 dark:text-brand-500">Thanks!</p>}
            <button
              type="submit"
              disabled={posting}
              className="mt-3 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {posting ? 'Posting…' : 'Post review'}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Link to={ROUTES.auth.login} className="font-medium text-brand-600 dark:text-brand-500">
              Log in
            </Link>{' '}
            to leave a rating.
          </p>
        )}
      </form>

      {status === 'loading' && (
        <SkeletonRegion label="Loading reviews" className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="rounded-card border border-neutral-100 p-4 dark:border-neutral-800">
              <SkeletonChip boxClassName="h-5" className="w-24" />
              <SkeletonText lines={2} className="mt-2" />
            </div>
          ))}
        </SkeletonRegion>
      )}

      {status === 'error' && (
        <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-800">
          Reviews aren’t available yet — <code className="font-mono text-xs">
            GET /restaurants/:id/reviews
          </code>{' '}
          hasn’t been built. See docs/API_REQUIREMENTS.md §B.
        </p>
      )}

      {status === 'ready' && reviews.length === 0 && (
        <p className="py-4 text-center text-sm text-neutral-400">
          No reviews yet. Be the first.
        </p>
      )}

      {status === 'ready' &&
        reviews.map((review) => (
          <article
            key={review.id}
            className="rounded-card border border-neutral-100 p-4 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink-900 dark:text-white">
                {review.author?.fullName ?? 'Someone'}
              </span>
              <Stars value={review.rating} size="sm" />
            </div>
            {review.body && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {review.body}
              </p>
            )}
            <p className="mt-2 text-xs text-neutral-400">{formatDate(review.createdAt)}</p>
          </article>
        ))}
    </div>
  );
}

function InfoTab({ joint }: { joint: FoodJoint }) {
  return (
    <div className="space-y-5">
      {joint.description && (
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {joint.description}
        </p>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          <Clock className="size-4" /> Opening hours
        </h3>
        {joint.openingHours && joint.openingHours.length > 0 ? (
          <div className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800">
            {joint.openingHours.map((hours, i) => (
              <div
                key={hours.day}
                className={`flex justify-between px-4 py-2 text-sm ${
                  i !== joint.openingHours!.length - 1
                    ? 'border-b border-neutral-100 dark:border-neutral-800'
                    : ''
                }`}
              >
                <span className="text-neutral-500 dark:text-neutral-400">
                  {DAY_NAMES[hours.day]}
                </span>
                <span className="font-medium text-ink-900 dark:text-white">
                  {hours.opens} – {hours.closes}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Not published.</p>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          <MapPin className="size-4" /> Where
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {joint.campusArea ?? (
            <span className="text-neutral-400">
              No campus area recorded — the API has no <code className="font-mono text-xs">
                campusArea
              </code>{' '}
              field yet (API_REQUIREMENTS.md §B).
            </span>
          )}
        </p>
        <Suspense fallback={<Skeleton className="mt-2 h-48 w-full rounded-card" />}>
          <MapView
            center={{ lat: joint.lat, lng: joint.lng }}
            zoom={17}
            markers={[{ id: joint.id, lat: joint.lat, lng: joint.lng, label: joint.name }]}
            ariaLabel={`Map showing ${joint.name}`}
            className="mt-2 h-48 w-full rounded-card"
          />
        </Suspense>
      </div>
    </div>
  );
}

export function FoodJointDetailPage() {
  const { slug = '' } = useParams();
  const [tab, setTab] = useState<Tab>('Menu');

  const slugRef = useRef(slug);
  slugRef.current = slug;

  // Detail and menu are fetched together, but a missing menu must not take
  // the page down with it — an unpublished menu is a legitimate state, not
  // an error, so that stream is caught and downgraded to [].
  const { data, status, retry } = useApiResource(() =>
    foodJointsApi.getFoodJoint$(slugRef.current).pipe(
      switchMap((joint) =>
        forkJoin({
          joint: of(joint),
          menu: foodJointsApi.getMenu$(joint.id).pipe(catchError(() => of([] as MenuSection[]))),
        }),
      ),
    ),
  );

  const retryRef = useRef(retry);
  retryRef.current = retry;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setTab('Menu');
    retryRef.current();
  }, [slug]);

  const joint = data?.joint ?? null;
  const menu = data?.menu ?? [];

  // FR-2.4. `phone`/`whatsapp` are not in the live payload yet, so these
  // resolve to undefined and the buttons render disabled with a reason
  // rather than disappearing.
  const telHref = joint?.phone ? `tel:${joint.phone}` : undefined;
  const whatsappHref = joint?.whatsapp ? `https://wa.me/${joint.whatsapp}` : undefined;
  const contactable = Boolean(telHref || whatsappHref);

  return (
    <div className="md:mx-auto md:max-w-5xl md:px-6 lg:px-8">
      <div className="px-5 pt-5 md:px-0 md:pt-8">
        <Link
          to={ROUTES.food}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 transition hover:text-ink-900 dark:hover:text-white"
        >
          <ChevronLeft className="size-4" /> Food joints
        </Link>
      </div>

      <div className="px-5 pt-4 md:px-0">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-card bg-gradient-to-br from-brand-100 to-brand-50 dark:from-neutral-900 dark:to-neutral-950">
          {joint?.heroImageUrl ? (
            <img src={joint.heroImageUrl} alt={joint.name} className="size-full object-cover" />
          ) : joint ? (
            <div className="flex size-full items-center justify-center text-brand-600 dark:text-brand-500">
              <Utensils className="size-12" />
            </div>
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
        </div>
      </div>

      <header className="px-5 pt-5 md:px-0">
        {joint ? (
          <>
            <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">
              {joint.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
              <span>
                {joint.cuisine} · {priceTierLabel(joint.priceTier)}
              </span>
              {joint.ratingCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="size-4 fill-accent-500 text-accent-500" />
                  <span className="font-medium text-ink-900 dark:text-white">
                    {joint.ratingAvg.toFixed(1)}
                  </span>
                  ({joint.ratingCount})
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  joint.isOpenNow
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {joint.isOpenNow ? 'Open now' : 'Closed'}
              </span>
            </div>
          </>
        ) : (
          <>
            <SkeletonLine boxClassName="h-8" className="w-2/3" />
            <div className="mt-2 flex gap-2">
              <SkeletonChip boxClassName="h-5" className="w-32" />
              <SkeletonChip boxClassName="h-5" className="w-20" />
            </div>
          </>
        )}
      </header>

      {status === 'error' && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 md:mx-0">
          <span>Couldn’t load this food joint.</span>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {/* Tabs are static — they render and switch before any data lands. */}
      <div className="mt-5 flex gap-1 border-b border-neutral-200 px-5 dark:border-neutral-800 md:px-0">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            aria-current={tab === name}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === name
                ? 'border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-500'
                : 'border-transparent text-neutral-500 hover:text-ink-900 dark:hover:text-white'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="px-5 pt-5 pb-28 md:px-0 md:pb-8">
        {!joint && status !== 'error' && (
          <SkeletonRegion label="Loading menu" className="space-y-3">
            <SkeletonLine className="w-24" />
            <Skeleton className="h-40 w-full rounded-card" />
          </SkeletonRegion>
        )}

        {joint && tab === 'Menu' && <MenuTab sections={menu} />}
        {joint && tab === 'Reviews' && <ReviewsTab jointId={joint.id} />}
        {joint && tab === 'Info' && <InfoTab joint={joint} />}
      </div>

      {/* FR-2.4 — the Contact action bar. Fixed above the tab bar on mobile,
          settling at the end of the content column on desktop rather than
          floating over the footer. */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 md:static md:mt-4 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none dark:md:bg-transparent">
        <div className="mx-auto max-w-md md:max-w-none">
          <div className="flex items-center gap-2">
            <ActionLink
              href={telHref}
              disabledTitle="No phone number published for this food joint"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 md:flex-none md:px-6"
            >
              <Phone className="size-4" /> Call
            </ActionLink>
            <ActionLink
              href={whatsappHref}
              external
              disabledTitle="No WhatsApp number published for this food joint"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-brand-600/30 bg-brand-50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-700/20 dark:text-brand-500 dark:hover:bg-brand-700/30 md:flex-none md:px-6"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </ActionLink>
            <ActionLink
              href={joint ? directionsUrl({ lat: joint.lat, lng: joint.lng }) : undefined}
              external
              aria-label="Directions"
              disabledTitle="Still loading"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink-900 transition hover:bg-neutral-200 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
              <Navigation className="size-5" />
            </ActionLink>
            {joint && <SaveButton type="FOOD_JOINT" itemId={joint.id} className="shrink-0" />}
          </div>

          {/* Honest, not hidden: the SRS's headline food action can't work
              until the payload carries a number. */}
          {joint && !contactable && (
            <p className="mt-1.5 text-xs text-neutral-400">
              No contact details published — the API has no{' '}
              <code className="font-mono">phone</code> or{' '}
              <code className="font-mono">whatsapp</code> field yet
              (docs/API_REQUIREMENTS.md §B).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
