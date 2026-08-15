import { Bookmark, MapPin, RefreshCw, Trash2, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { favoritesApi, type Favorite } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { ROUTES } from '@/lib/routes';

// FR-1.7 — the places a signed-in user has bookmarked.
//
// `item` is snapshotted server-side at save time, so the whole list renders
// from one call with no per-item lookups.

function FavoriteRow({ favorite, onRemove }: { favorite: Favorite; onRemove: (id: string) => void }) {
  const isFood = favorite.type === 'FOOD_JOINT';
  const Icon = isFood ? Utensils : MapPin;
  const to = favorite.item?.slug
    ? `${isFood ? ROUTES.food : ROUTES.explore}/${favorite.item.slug}`
    : isFood
      ? ROUTES.food
      : ROUTES.explore;

  return (
    <div className="flex items-center gap-3 rounded-card border border-neutral-100 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <Link to={to} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500">
          {favorite.item?.imageUrl ? (
            <img src={favorite.item.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <Icon className="size-6" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-900 dark:text-white">
            {favorite.item?.title ?? 'Saved place'}
          </span>
          <span className="block truncate text-sm text-neutral-500 dark:text-neutral-400">
            {isFood ? 'Food joint' : 'Campus location'}
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={() => onRemove(favorite.id)}
        aria-label={`Remove ${favorite.item?.title ?? 'this place'} from saved`}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-danger-500 dark:hover:bg-neutral-800"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function SavedPage() {
  const { data, status, retry } = useApiResource(() => favoritesApi.listFavorites$());
  const [removing, setRemoving] = useState<string | null>(null);
  const favorites = data?.results ?? [];

  function remove(id: string) {
    setRemoving(id);
    favoritesApi.removeFavorite$(id).subscribe({
      next: () => retry(),
      error: () => setRemoving(null),
      complete: () => setRemoving(null),
    });
  }

  return (
    <div className="md:mx-auto md:max-w-3xl md:px-6 lg:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">Saved</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Places and food joints you’ve bookmarked.
        </p>
      </header>

      <section className="px-5 pb-4 md:px-0">
        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn’t load your saved places.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Same row shape as the real cards — icon tile, two text rows, a
            trailing icon button. */}
        {status === 'loading' && (
          <SkeletonRegion label="Loading saved places" className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-card border border-neutral-100 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Skeleton className="size-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-1/2" />
                  <SkeletonLine className="h-3 w-1/3" />
                </div>
                <Skeleton className="size-10 shrink-0 rounded-full" />
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && favorites.length === 0 && (
          <div className="rounded-card border border-dashed border-neutral-200 px-5 py-10 text-center dark:border-neutral-800">
            <Bookmark className="mx-auto size-8 text-neutral-300 dark:text-neutral-700" />
            <p className="mt-3 text-sm font-medium text-ink-900 dark:text-white">
              Nothing saved yet
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Tap Save on any campus location or food joint and it lands here.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                to={ROUTES.explore}
                className="inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Explore campus
              </Link>
              <Link
                to={ROUTES.food}
                className="inline-block rounded-full border border-brand-600/30 bg-brand-50 px-5 py-2.5 text-sm font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-700/20 dark:text-brand-500"
              >
                Browse food joints
              </Link>
            </div>
          </div>
        )}

        {status === 'ready' && favorites.length > 0 && (
          <div className="space-y-3">
            {favorites.map((favorite) => (
              <div key={favorite.id} className={removing === favorite.id ? 'opacity-50' : ''}>
                <FavoriteRow favorite={favorite} onRemove={remove} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
