import { ChevronLeft, Mail, Plus, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Subscription } from 'rxjs';
import { ApiError, emergencyApi, getTokens, type PersonalEmergencyContact } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { ROUTES } from '@/lib/routes';

// Profile → Emergency Contacts. Backed by GET/PUT /users/me/emergency-contacts.
//
// PUT replaces the entire list — there's no per-contact endpoint — so this
// edits a local draft and saves it in one call. That also means "Save" is an
// explicit action rather than each row autosaving.
function emptyContact(): PersonalEmergencyContact {
  return { name: '', phone: '', email: '', relationship: '' };
}

function LoggedOutPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
      <TriangleAlert className="size-12 text-neutral-300 dark:text-neutral-700" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Log in to manage the people we contact in an emergency.
      </p>
      <Link
        to={ROUTES.auth.login}
        className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
      >
        Log in
      </Link>
    </div>
  );
}

function ContactsEditor() {
  const { data, status, retry } = useApiResource(() => emergencyApi.getMyEmergencyContacts$());
  const [draft, setDraft] = useState<PersonalEmergencyContact[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const subscription = useRef<Subscription | null>(null);

  useEffect(() => () => subscription.current?.unsubscribe(), []);

  // Seed the editable draft once the server list arrives.
  useEffect(() => {
    if (data) setDraft(data.length > 0 ? data : [emptyContact()]);
  }, [data]);

  const contacts = draft ?? [];

  function update(index: number, patch: Partial<PersonalEmergencyContact>) {
    setSaved(false);
    setDraft((current) =>
      (current ?? []).map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Drop blank rows; a contact needs at least a name and a phone.
    const cleaned = contacts
      .map((c) => ({
        name: c.name.trim(),
        phone: c.phone.trim(),
        email: c.email?.trim() || undefined,
        relationship: c.relationship?.trim() || undefined,
      }))
      .filter((c) => c.name || c.phone);

    if (cleaned.some((c) => !c.name || !c.phone)) {
      setError('Every contact needs both a name and a phone number.');
      return;
    }

    setSaving(true);
    setError(null);
    subscription.current?.unsubscribe();
    subscription.current = emergencyApi.replaceMyEmergencyContacts$(cleaned).subscribe({
      next: () => {
        setSaving(false);
        setSaved(true);
        retry();
      },
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not save your contacts.');
        setSaving(false);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 flex items-start gap-2 rounded-card bg-accent-500/10 px-4 py-3">
        <Mail className="mt-0.5 size-4 shrink-0 text-accent-500" />
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Contacts with an email address are notified when you trigger an SOS. SMS isn't wired up
          yet, so an email is the only way they'll hear from us.
        </p>
      </div>

      {status === 'loading' && (
        <SkeletonRegion label="Loading your contacts" className="space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-card" />
          ))}
        </SkeletonRegion>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span>Couldn't load your contacts.</span>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="space-y-4">
            {contacts.map((contact, index) => (
              <div
                key={index}
                className="rounded-card border border-neutral-100 p-4 dark:border-neutral-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink-900 dark:text-white">
                    Contact {index + 1}
                  </h2>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDraft((c) => (c ?? []).filter((_, i) => i !== index))}
                      aria-label={`Remove contact ${index + 1}`}
                      className="rounded-full p-1.5 text-neutral-400 transition hover:bg-danger-500/10 hover:text-danger-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <TextField
                  label="Name"
                  id={`name-${index}`}
                  value={contact.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="e.g. Ama Mensah"
                />
                <TextField
                  label="Phone"
                  id={`phone-${index}`}
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => update(index, { phone: e.target.value })}
                  placeholder="+233201234567"
                />
                <TextField
                  label="Email (notified on SOS)"
                  id={`email-${index}`}
                  type="email"
                  value={contact.email ?? ''}
                  onChange={(e) => update(index, { email: e.target.value })}
                  placeholder="ama@example.com"
                />
                <TextField
                  label="Relationship"
                  id={`relationship-${index}`}
                  value={contact.relationship ?? ''}
                  onChange={(e) => update(index, { relationship: e.target.value })}
                  placeholder="e.g. Sister"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setDraft((c) => [...(c ?? []), emptyContact()])}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 transition hover:border-brand-500 hover:text-brand-600 dark:border-neutral-700 dark:text-neutral-400"
          >
            <Plus className="size-4" /> Add another contact
          </button>

          {error && <p className="mt-4 text-sm text-danger-500">{error}</p>}
          {saved && (
            <p className="mt-4 text-sm text-brand-600 dark:text-brand-500">Contacts saved.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save contacts'}
          </button>
        </>
      )}
    </form>
  );
}

export function EmergencyContactsPage() {
  return (
    <div className="px-5 pt-6 pb-10 md:mx-auto md:max-w-xl md:pt-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to={ROUTES.profile}
          className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-ink-900 dark:bg-neutral-900 dark:text-white"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Emergency Contacts</h1>
      </div>

      {getTokens() ? <ContactsEditor /> : <LoggedOutPrompt />}
    </div>
  );
}
