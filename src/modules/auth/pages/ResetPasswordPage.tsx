import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PasswordField } from '@/components/ui/PasswordField';
import { ApiError, authApi } from '@/lib/api';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { ROUTES } from '@/lib/routes';

// Step 2 of password recovery. The token arrives in the emailed link as
// ?token=… — this page never generates it. Tokens are single-use, so a
// failed submit means "request a new link", not "try again".
const MIN_PASSWORD = 8;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Both passwords must match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    authApi.resetPassword$(token, password).subscribe({
      next: () => {
        setSubmitting(false);
        setDone(true);
      },
      error: (err: unknown) => {
        setError(
          err instanceof ApiError
            ? `${err.message} — reset links expire and can only be used once.`
            : 'Could not reset your password.',
        );
        setSubmitting(false);
      },
    });
  }

  // Reached by opening /reset-password directly, or by a mangled email link.
  if (!token) {
    return (
      <AuthLayout title="This link isn't valid">
        <div className="rounded-card border border-neutral-100 p-5 text-center dark:border-neutral-800">
          <TriangleAlert className="mx-auto size-10 text-accent-500" />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            Open the reset link from your email, or request a new one.
          </p>
          <Link
            to={ROUTES.auth.forgotPassword}
            className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated">
        <div className="rounded-card border border-brand-500/30 bg-brand-50 p-5 text-center dark:bg-brand-700/15">
          <CheckCircle2 className="mx-auto size-10 text-brand-600" />
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            You can now log in with your new password.
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.auth.login)}
            className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Log in
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle={`Choose a password of at least ${MIN_PASSWORD} characters.`}
    >

      <form onSubmit={handleSubmit}>
        <PasswordField
          label="New password"
          placeholder="Enter a new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={MIN_PASSWORD}
          required
        />
        <PasswordField
          label="Confirm new password"
          placeholder="Re-enter the password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {error && <p className="mb-4 text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Need a new link?{' '}
        <Link
          to={ROUTES.auth.forgotPassword}
          className="font-medium text-brand-600 dark:text-brand-500"
        >
          Request one
        </Link>
      </p>
    </AuthLayout>
  );
}
