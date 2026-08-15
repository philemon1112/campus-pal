import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getTokens } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';

// Route guard for everything that isn't browsable signed out.
//
// **The trap this avoids:** redirecting on `!user` alone bounces a perfectly
// valid session to /login on every hard refresh, because GET /users/me is
// still in flight for the first moment. So:
//   - a stored token + auth still loading  -> hold, show a placeholder
//   - no token at all                      -> redirect immediately
//   - token present but the profile failed -> redirect (revoked/expired)
//
// The intended path is preserved in `?next=` so login can return the user
// where they were headed instead of dumping them on the home page.
//
// This is UX, not security: the API enforces auth on every call regardless.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  const hasToken = getTokens() !== null;

  if (hasToken && loading) {
    // Deliberately a content-shaped placeholder, not a spinner — same rule
    // as everywhere else (docs/UI_CONVENTIONS.md).
    return (
      <SkeletonRegion label="Checking your session" className="space-y-3 px-5 py-10">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full rounded-card" />
        <Skeleton className="h-40 w-full rounded-card" />
      </SkeletonRegion>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
}
