import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Subscription } from 'rxjs';
import { ApiError, favoritesApi, getTokens, type FavoriteType } from '@/lib/api';

// FR-1.7 — bookmark a location or a food joint. Both types are backed.
//
// Signed out, the control still renders but is disabled and says why. The
// alternative — hiding it — would make the screen quietly different for
// signed-out users rather than showing them what an account is for.
export function SaveButton({
  type,
  itemId,
  className = '',
}: {
  type: FavoriteType;
  itemId: string;
  className?: string;
}) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscription = useRef<Subscription | null>(null);

  const usable = getTokens() !== null;

  // Resolve whether this item is already saved. Only worth asking when the
  // call can actually succeed.
  useEffect(() => {
    if (!usable) return;
    const sub = favoritesApi.listFavorites$(type).subscribe({
      next: (page) => {
        const existing = page.results.find((f) => f.itemId === itemId);
        setFavoriteId(existing?.id ?? null);
      },
      // A failed lookup just means "unknown" — render as unsaved rather
      // than blocking the control.
      error: () => setFavoriteId(null),
    });
    return () => sub.unsubscribe();
  }, [usable, type, itemId]);

  useEffect(() => () => subscription.current?.unsubscribe(), []);

  function toggle() {
    if (!usable || busy) return;
    subscription.current?.unsubscribe();
    setBusy(true);
    setError(null);

    subscription.current = favoriteId
      ? favoritesApi.removeFavorite$(favoriteId).subscribe({
          next: () => {
            setFavoriteId(null);
            setBusy(false);
          },
          error: () => {
            setError('Couldn’t remove that.');
            setBusy(false);
          },
        })
      : favoritesApi.addFavorite$(type, itemId).subscribe({
          next: (favorite) => {
            setFavoriteId(favorite.id);
            setBusy(false);
          },
          error: (err: unknown) => {
            // 409 means it's already saved — the lookup above just hadn't
            // resolved yet. Re-read rather than reporting a failure.
            if (err instanceof ApiError && err.code === 409) {
              favoritesApi.listFavorites$(type).subscribe({
                next: (page) =>
                  setFavoriteId(page.results.find((f) => f.itemId === itemId)?.id ?? null),
                error: () => setError('Couldn’t save that.'),
              });
            } else {
              setError('Couldn’t save that.');
            }
            setBusy(false);
          },
        });
  }

  const hint = usable ? undefined : 'Log in to save places';

  const Icon = favoriteId ? BookmarkCheck : Bookmark;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        disabled={!usable || busy}
        title={hint}
        aria-label={favoriteId ? 'Remove from saved' : 'Save'}
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
          favoriteId
            ? 'bg-brand-600 text-white hover:bg-brand-700'
            : 'border border-brand-600/30 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-700/20 dark:text-brand-500 dark:hover:bg-brand-700/30'
        }`}
      >
        <Icon className="size-4" />
        {favoriteId ? 'Saved' : 'Save'}
      </button>
      {(hint || error) && (
        <p className="mt-1 text-xs text-neutral-400">{error ?? hint}</p>
      )}
    </div>
  );
}
