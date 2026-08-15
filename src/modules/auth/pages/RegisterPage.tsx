import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { TextField } from '@/components/ui/TextField';
import { PasswordField } from '@/components/ui/PasswordField';
import { authApi, usersApi, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { ROUTES } from '@/lib/routes';

// Matches the Figma "Create Account" screen (Full Name / Email / Phone /
// Password). The live API's RegisterDto only accepts email/password/
// fullName — phone isn't a registration field there — so phone is saved
// with a follow-up PATCH /users/me after a successful register.
export function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  // RequireAuth parks the intended destination here so login can return the
  // user to it instead of always dumping them on the home page.
  const [params] = useSearchParams();
  const next = params.get('next');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    authApi
      .register$({ email, password, fullName })
      .pipe(
        switchMap(() =>
          phone.trim()
            ? usersApi.updateMe$({ phone: phone.trim() }).pipe(catchError(() => of(null)))
            : of(null),
        ),
      )
      .subscribe({
        next: () => {
          // Pull the new profile into the shared auth context so the nav
          // reflects the session immediately, without a full page reload.
          refresh();
          navigate(next || ROUTES.home, { replace: true });
        },
        error: (err: unknown) => {
          setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
          setSubmitting(false);
        },
      });
  }

  return (
    <AuthLayout title="Create account" subtitle="Start planning your trip around Ghana.">

      <form onSubmit={handleSubmit}>
        <TextField
          label="Full Name"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
        />
        <TextField
          label="Email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Phone"
          type="tel"
          placeholder="Enter your phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <PasswordField
          label="Password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        {error && <p className="mb-4 text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Already have an account?{' '}
        <Link to={ROUTES.auth.login} className="font-medium text-brand-600 dark:text-brand-500">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
