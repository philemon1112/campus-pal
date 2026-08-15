import { ChevronLeft, MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { TextField } from '@/components/ui/TextField';
import { ApiError, authApi } from '@/lib/api';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { ROUTES } from '@/lib/routes';

// Step 1 of password recovery: POST /auth/forgot-password emails a reset
// link. The endpoint always returns 200 whether or not the account exists
// (deliberate — it prevents account enumeration), so the success copy below
// is careful to say "if an account exists" rather than confirming one does.
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    authApi.forgotPassword$(email.trim()).subscribe({
      next: () => {
        setSubmitting(false);
        setSent(true);
      },
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not send the reset link.');
        setSubmitting(false);
      },
    });
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter the email on your account and we'll send you a link to set a new password."
      footer={
        <Link
          to={ROUTES.auth.login}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400"
        >
          <ChevronLeft className="size-4" /> Back to log in
        </Link>
      }
    >

      {sent ? (
        <div className="rounded-card border border-brand-500/30 bg-brand-50 p-4 dark:bg-brand-700/15">
          <MailCheck className="size-8 text-brand-600 dark:text-brand-500" />
          <p className="mt-3 font-semibold text-ink-900 dark:text-white">Check your inbox</p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            If an account exists for <span className="font-medium">{email}</span>, we've sent it a
            link to reset the password. The link can only be used once.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-3 text-sm font-medium text-brand-600 dark:text-brand-500"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && <p className="mb-4 text-sm text-danger-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
