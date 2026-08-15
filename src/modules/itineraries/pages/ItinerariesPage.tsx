import { CalendarRange, Loader2, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Subscription } from 'rxjs';
import { ApiError, getTokens, itinerariesApi, type GenerateItineraryInput } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import {
  Skeleton,
  SkeletonChip,
  SkeletonCircle,
  SkeletonLine,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { formatDate } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// AI trip planner — the one place the /itineraries endpoints are used.
// No Figma screen exists for this (the prototype predates the AI planner),
// so the layout follows the conventions of the existing data-driven pages.
// Reached from Home's Quick Access grid.

// Server-side DTO bounds (see the integration guide §9). Enforced here so
// the API's joined-string 400 is a fallback rather than the primary UX.
const MAX_DAYS = 14;
const MAX_PARTY = 20;
const MAX_INTERESTS = 10;
const MAX_INTEREST_LENGTH = 40;

function generationErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Could not generate an itinerary.';
  // 408 is ours, from the client-side timeout in lib/api/client.ts.
  if (err.code === 408) return 'The planner took too long to respond. Please try again.';
  if (err.code === 502) return "The planner couldn't produce a plan. Please try again.";
  if (err.code === 503) return 'The AI planner is not configured on the server right now.';
  return err.message;
}

function LoggedOutPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
      <Sparkles className="size-12 text-neutral-300 dark:text-neutral-700" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Log in to plan a trip with AI and save your itineraries.
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

function SavedItineraries() {
  const { data, status, retry } = useApiResource(() => itinerariesApi.listItineraries$());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteSubscription = useRef<Subscription | null>(null);

  useEffect(() => () => deleteSubscription.current?.unsubscribe(), []);

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteSubscription.current?.unsubscribe();
    deleteSubscription.current = itinerariesApi.deleteItinerary$(id).subscribe({
      next: () => {
        setDeletingId(null);
        retry();
      },
      error: () => setDeletingId(null),
    });
  }

  // Mirrors the real row below: title line, meta line, delete-button slot.
  if (status === 'loading') {
    return (
      <SkeletonRegion label="Loading saved itineraries" className="space-y-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="w-3/5" />
              <SkeletonLine className="w-2/5" />
            </div>
            <SkeletonCircle className="size-8 shrink-0" />
          </div>
        ))}
      </SkeletonRegion>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <span>Couldn't load your itineraries.</span>
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
        >
          <RefreshCw className="size-4" /> Retry
        </button>
      </div>
    );
  }

  const itineraries = data?.results ?? [];

  if (itineraries.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-800">
        No saved itineraries yet. Generate one above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {itineraries.map((itinerary) => (
        <div
          key={itinerary.id}
          className="flex items-center gap-3 rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
        >
          <Link to={`${ROUTES.itineraries}/${itinerary.id}`} className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink-900 dark:text-white">
              {itinerary.title}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
              <CalendarRange className="size-3.5 shrink-0" />
              {itinerary.destinationName} · {itinerary.days}{' '}
              {itinerary.days === 1 ? 'day' : 'days'} · {formatDate(itinerary.createdAt)}
            </div>
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(itinerary.id)}
            disabled={deletingId === itinerary.id}
            aria-label={`Delete ${itinerary.title}`}
            className="shrink-0 rounded-full p-2 text-neutral-400 transition hover:bg-danger-500/10 hover:text-danger-500 disabled:opacity-40"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function PlannerContent() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('3');
  const [partySize, setPartySize] = useState('2');
  const [budget, setBudget] = useState('');
  const [interests, setInterests] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A generation takes ~66s — long enough that the user can navigate away
  // mid-flight, so the subscription has to be cancellable on unmount.
  const generateSubscription = useRef<Subscription | null>(null);

  useEffect(() => () => generateSubscription.current?.unsubscribe(), []);

  function handleGenerate(event: React.FormEvent) {
    event.preventDefault();

    const trimmedDestination = destination.trim();
    if (trimmedDestination.length < 2) {
      setError('Enter a destination (at least 2 characters).');
      return;
    }

    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_DAYS) {
      setError(`Days must be a whole number between 1 and ${MAX_DAYS}.`);
      return;
    }

    const parsedParty = Number(partySize);
    if (!Number.isInteger(parsedParty) || parsedParty < 1 || parsedParty > MAX_PARTY) {
      setError(`Party size must be a whole number between 1 and ${MAX_PARTY}.`);
      return;
    }

    const parsedInterests = interests
      .split(',')
      .map((interest) => interest.trim())
      .filter(Boolean);
    if (parsedInterests.length > MAX_INTERESTS) {
      setError(`Pick at most ${MAX_INTERESTS} interests.`);
      return;
    }
    if (parsedInterests.some((interest) => interest.length > MAX_INTEREST_LENGTH)) {
      setError(`Each interest must be ${MAX_INTEREST_LENGTH} characters or fewer.`);
      return;
    }

    const input: GenerateItineraryInput = {
      destination: trimmedDestination,
      days: parsedDays,
      partySize: parsedParty,
    };
    if (parsedInterests.length > 0) input.interests = parsedInterests;

    if (budget.trim()) {
      const parsedBudget = Number(budget);
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
        setError('Budget must be a positive amount.');
        return;
      }
      // The field is in whole GHS for humans; the API takes integer pesewas.
      input.budgetMinor = Math.round(parsedBudget * 100);
    }

    setError(null);
    setGenerating(true);
    generateSubscription.current = itinerariesApi.generateItinerary$(input).subscribe({
      next: (itinerary) => navigate(`${ROUTES.itineraries}/${itinerary.id}`),
      error: (err: unknown) => {
        setError(generationErrorMessage(err));
        setGenerating(false);
      },
    });
  }

  return (
    <div className="px-5 py-6 md:mx-auto md:max-w-2xl md:py-10">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-900 dark:text-white">
          <Sparkles className="size-6 text-brand-600" /> Plan a trip
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Tell us where you're going and we'll draft a day-by-day plan built around real tours you
          can book.
        </p>
      </header>

      <fieldset disabled={generating} className="contents">
      <form onSubmit={handleGenerate}>
        <TextField
          label="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Cape Coast"
          maxLength={120}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Days"
            type="number"
            min={1}
            max={MAX_DAYS}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <TextField
            label="Travellers"
            type="number"
            min={1}
            max={MAX_PARTY}
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
          />
        </div>
        <TextField
          label="Budget (GHS, optional)"
          type="number"
          min={0}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="e.g. 2000"
        />
        <TextField
          label="Interests (optional)"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="history, beaches, food"
        />

        {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {generating && <Loader2 className="size-4 animate-spin" />}
          {generating ? 'Planning your trip…' : 'Generate itinerary'}
        </button>
      </form>
      </fieldset>

      {/* The generate call is synchronous server-side and measured at ~66s.
          Rather than replacing the page with a spinner, the form stays put
          (disabled) and the plan being built is previewed in its real shape:
          the same day sections and item cards the detail page will render.
          The wait is stated out loud because a minute of silent shimmer
          reads as a hang. */}
      {generating && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Building your plan</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Drafting a day-by-day plan around real, bookable tours. This usually takes about a
            minute.
          </p>

          <div className="mt-4 rounded-card bg-brand-50 px-4 py-3 dark:bg-brand-700/15">
            <SkeletonText lines={2} />
          </div>

          {[1, 2].map((day) => (
            <div key={day} className="mt-6">
              <Skeleton className="h-6 w-2/3" />
              <SkeletonLine className="mb-2 mt-4 w-20" />
              <SkeletonRegion
                label={`Building day ${day}`}
                className="space-y-2 rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <SkeletonLine className="w-1/2" />
                  <SkeletonChip className="w-14 shrink-0" />
                </div>
                <SkeletonText lines={2} />
              </SkeletonRegion>
            </div>
          ))}
        </section>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink-900 dark:text-white">Saved itineraries</h2>
      <SavedItineraries />
    </div>
  );
}

export function ItinerariesPage() {
  // Every /itineraries endpoint requires auth, so short-circuit rather than
  // firing a request that can only 401.
  if (!getTokens()) return <LoggedOutPrompt />;
  return <PlannerContent />;
}
