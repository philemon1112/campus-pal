import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { TextField } from '@/components/ui/TextField';
import { PasswordField } from '@/components/ui/PasswordField';
import {
  authApi,
  usersApi,
  ApiError,
  AFFILIATIONS,
  AFFILIATION_LABELS,
  type Affiliation,
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import { ROUTES } from '@/lib/routes';

// SRS 2.3's user classes are chosen here: `affiliation` becomes the
// account's role, which is what the vendor/admin consoles gate on. Omitting
// it would silently create a TOURIST — the tourism app's default — so
// CampusPal always sends one.
//
// Phone isn't a field on RegisterDto, so it's saved with a follow-up
// PATCH /users/me after a successful register.
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
  const [affiliation, setAffiliation] = useState<Affiliation>('STUDENT');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    authApi
      .register$({ email, password, fullName, affiliation })
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
    <AuthLayout title="Create account" subtitle="Save places and keep your chat history.">

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
        {/* SRS 2.3 — this becomes the account's role. Vendor and
            administrator accounts are provisioned by the CampusPal team, so
            they aren't offered here. */}
        <fieldset className="mb-4">
          <legend className="mb-1.5 text-sm font-medium text-ink-900 dark:text-white">
            I’m a…
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {AFFILIATIONS.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
                  affiliation === value
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-700/20 dark:text-brand-500'
                    : 'border-neutral-200 text-neutral-600 hover:border-brand-500 dark:border-neutral-800 dark:text-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="affiliation"
                  value={value}
                  checked={affiliation === value}
                  onChange={() => setAffiliation(value)}
                  className="sr-only"
                />
                {AFFILIATION_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>

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
