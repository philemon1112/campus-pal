import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { ROUTES } from '@/lib/routes';
import type { UserRole } from '@/lib/api';

// Presentation-only guard for the operator/admin consoles. The API enforces
// roles server-side on every call, so this exists to avoid showing someone a
// console full of buttons that will only ever 403 -- not as a security
// boundary.
//
// Deliberately *not* a redirect: per docs/UI_CONVENTIONS.md the page keeps
// its own shell (heading, container, nav) and the gate renders inline where
// the content would be. A redirect would also race the auth fetch, bouncing
// a legitimate operator to the home page on every hard refresh.
export function RoleGate({
  allow,
  title,
  children,
}: {
  allow: UserRole[];
  title: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  // Auth is still resolving -- show the page's own frame with placeholder
  // rows rather than flashing the "not allowed" panel at someone who is.
  if (loading) {
    return (
      <div className="md:mx-auto md:max-w-7xl md:px-8">
        <header className="px-5 pt-6 pb-4 md:px-0 md:pt-10">
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">{title}</h1>
        </header>
        <SkeletonRegion label={`Loading ${title}`} className="space-y-3 px-5 md:px-0">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/2" />
        </SkeletonRegion>
      </div>
    );
  }

  if (!user || !allow.includes(user.role)) {
    const roleWords = allow.map((r) => (r === 'OPERATOR' ? 'tour operators' : 'administrators'));
    return (
      <div className="md:mx-auto md:max-w-7xl md:px-8">
        <header className="px-5 pt-6 pb-4 md:px-0 md:pt-10">
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">{title}</h1>
        </header>
        <div className="mx-5 rounded-card border border-neutral-100 bg-neutral-50 px-5 py-8 text-center dark:border-neutral-800 dark:bg-neutral-900 md:mx-0">
          <Lock className="mx-auto size-8 text-neutral-400" />
          <p className="mt-3 text-sm font-medium text-ink-900 dark:text-white">
            This area is for {roleWords.join(' and ')}.
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {user
              ? 'Your account doesn’t have access. These accounts are provisioned by the Voyago team — public sign-up always creates a tourist account.'
              : 'Sign in with an operator account to continue.'}
          </p>
          {!user && (
            <Link
              to={ROUTES.auth.login}
              className="mt-4 inline-block rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
