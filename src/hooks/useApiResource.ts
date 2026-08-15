import { useEffect, useRef, useState } from 'react';
import type { Observable, Subscription } from 'rxjs';

type Status = 'loading' | 'error' | 'ready';

// Small fetch-with-retry hook, subscribes to `fetcher()` once on mount --
// the live API (Render free tier) has shown intermittent 503s, so every
// list/detail screen needs a retry affordance rather than silently
// rendering empty. Unlike a Promise, an Observable can be cancelled: the
// subscription is torn down on unmount, and `retry()` unsubscribes any
// still-pending previous request first so a slow stale response can't
// overwrite fresher state.
// If a screen needs to refetch when some param changes (e.g. a slug from
// the URL), call `retry()` from a `useEffect` keyed on that param.
export function useApiResource<T>(fetcher: () => Observable<T>) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const subscriptionRef = useRef<Subscription | null>(null);

  function load() {
    subscriptionRef.current?.unsubscribe();
    setStatus('loading');
    subscriptionRef.current = fetcherRef.current().subscribe({
      next: (result) => {
        setData(result);
        setStatus('ready');
      },
      error: () => setStatus('error'),
    });
  }

  useEffect(() => {
    load();
    return () => subscriptionRef.current?.unsubscribe();
  }, []);

  return { data, status, retry: load };
}
