import { Bot, Navigation, MapPin, MessageCircle, Phone, Send, Sparkles, Utensils, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  favoritesApi,
  type AssistantAction,
  type AssistantMessage,
  type AssistantResults,
  type CampusLocation,
  type FoodJoint,
} from '@/lib/api';
import { useAssistant } from '@/hooks/useAssistant';
import { LocationCard } from '@/components/cards/LocationCard';
import { FoodJointCard } from '@/components/cards/FoodJointCard';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import { directionsUrl } from '@/lib/geo';
import { ROUTES } from '@/lib/routes';

// The assistant surface (SRS 3.3). An overlay sheet on mobile, a docked
// right-hand panel at md+.
//
// FR-3.5 is the interesting part and it lives in `runAction` below: the
// assistant returns a closed union of actions (see AssistantAction in
// types.ts) and this component EXECUTES them — navigating, opening
// directions, placing a call — rather than printing a suggestion and leaving
// the user to find the screen themselves.
//
// Nothing here simulates a reply. While the backend has no /assistant/chat
// endpoint the panel renders its full shell and says so once; it does not
// hand back canned answers (CLAUDE.md: never fabricate data).

// Starter prompts, taken from the SRS's own worked examples (Appendix 8.1).
// These are UI copy, not data — they fill the composer, they don't fake a
// conversation.
const SUGGESTIONS = [
  'Where is the Balme Library?',
  'Show me food joints near Legon Hall',
  'Direct me to the School of Engineering Sciences',
  'What food joints sell waakye?',
];

function ActionButton({ action }: { action: AssistantAction }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function runAction() {
    switch (action.type) {
      case 'OPEN_LOCATION':
        return navigate(`${ROUTES.explore}/${action.slug}`);
      case 'OPEN_FOOD_JOINT':
        return navigate(`${ROUTES.food}/${action.slug}`);
      case 'SHOW_DIRECTIONS':
        // Hands off to whatever maps app the device has, same as every
        // Directions control in the app (src/lib/geo.ts).
        window.open(directionsUrl({ lat: action.lat, lng: action.lng }), '_blank', 'noopener');
        return;
      case 'CONTACT_FOOD_JOINT':
        // The assistant can only offer this once the joint has a number;
        // routing to the detail page keeps one implementation of "contact"
        // rather than a second copy of the tel:/wa.me logic here.
        return navigate(`${ROUTES.food}/${action.slug}`);
      case 'SAVE_FAVORITE': {
        if (!favoritesApi.isSupported(action.favoriteType)) {
          setSaveError('Saving campus locations needs a backend change.');
          return;
        }
        favoritesApi.addFavorite$(action.favoriteType, action.itemId).subscribe({
          next: () => setSaved(true),
          error: () => setSaveError("Couldn't save that."),
        });
        return;
      }
    }
  }

  const label =
    action.type === 'SHOW_DIRECTIONS'
      ? `Directions to ${action.name}`
      : action.type === 'SAVE_FAVORITE'
        ? saved
          ? `Saved ${action.name}`
          : `Save ${action.name}`
        : action.type === 'CONTACT_FOOD_JOINT'
          ? `Contact ${action.name}`
          : `Open ${action.name}`;

  const Icon =
    action.type === 'SHOW_DIRECTIONS'
      ? Navigation
      : action.type === 'CONTACT_FOOD_JOINT'
        ? action.channel === 'WHATSAPP'
          ? MessageCircle
          : Phone
        : action.type === 'OPEN_FOOD_JOINT'
          ? Utensils
          : MapPin;

  return (
    <>
      <button
        type="button"
        onClick={runAction}
        disabled={saved}
        className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        <Icon className="size-3.5" /> {label}
      </button>
      {saveError && <span className="text-xs text-danger-500">{saveError}</span>}
    </>
  );
}

// Inline result cards. `kind` picks the card, so an assistant answer renders
// with exactly the same component the browse screens use.
function ResultGroup({ group }: { group: AssistantResults }) {
  if (group.items.length === 0) return null;
  return (
    <div className="mt-2 space-y-2">
      {group.kind === 'LOCATION'
        ? (group.items as CampusLocation[]).map((item) => (
            <LocationCard key={item.id} location={item} />
          ))
        : (group.items as FoodJoint[]).map((item) => <FoodJointCard key={item.id} joint={item} />)}
    </div>
  );
}

function Bubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={isUser ? 'max-w-[85%]' : 'w-full'}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-600 text-white'
              : 'bg-neutral-100 text-ink-900 dark:bg-neutral-900 dark:text-white'
          }`}
        >
          {message.content}
        </div>

        {/* FR-3.6: a request outside the app's feature set comes back as a
            plain message with no actions. That needs no special case — an
            empty actions array simply renders nothing below the bubble. */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {message.actions.map((action, i) => (
              <ActionButton key={`${action.type}-${i}`} action={action} />
            ))}
          </div>
        )}

        {message.results?.map((group, i) => <ResultGroup key={i} group={group} />)}
      </div>
    </div>
  );
}

export function AssistantPanel() {
  const { open, messages, sending, error, unavailable, closePanel, send, clear } = useAssistant();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the newest message in view as the transcript grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Escape closes, which is the expected exit for anything modal.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  if (!open) return null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    send(draft);
    setDraft('');
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close assistant"
        onClick={closePanel}
        className="absolute inset-0 bg-black/40"
      />

      <aside
        role="dialog"
        aria-label="CampusPal assistant"
        className="relative flex h-full w-full flex-col bg-white shadow-2xl dark:bg-neutral-950 md:w-[26rem]"
      >
        <header className="flex items-center gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-ink-900 dark:text-white">Ask CampusPal</h2>
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              Campus locations, directions and food joints
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-neutral-500 hover:text-ink-900 dark:hover:text-white"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && !unavailable && (
            <div className="pt-6 text-center">
              <Bot className="mx-auto size-10 text-neutral-300 dark:text-neutral-700" />
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                Ask for a place on campus, or somewhere to eat. I can open it, get you directions,
                or put you in touch.
              </p>
              <div className="mt-4 space-y-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setDraft(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-left text-sm text-ink-900 transition hover:border-brand-500 hover:bg-brand-50 dark:border-neutral-800 dark:text-white dark:hover:bg-brand-700/15"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))}

          {/* NFR-3 wants 3-5s, so this is a short wait rather than the
              minute-long one that needs wording (UI_CONVENTIONS §5). Shaped
              like an assistant bubble so the reply lands in place. */}
          {sending && (
            <SkeletonRegion label="Assistant is replying" className="flex justify-start">
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
            </SkeletonRegion>
          )}

          {error && (
            <p className="rounded-xl bg-danger-500/10 px-4 py-2.5 text-sm text-danger-500">
              {error}
            </p>
          )}

          {/* The honest state while /assistant/chat doesn't exist. Stated
              once, with no Retry — retrying a missing endpoint is theatre.
              See docs/API_REQUIREMENTS.md §C. */}
          {unavailable && (
            <div className="rounded-card border border-dashed border-neutral-300 px-4 py-6 text-center dark:border-neutral-700">
              <Bot className="mx-auto size-8 text-neutral-300 dark:text-neutral-700" />
              <p className="mt-3 text-sm font-medium text-ink-900 dark:text-white">
                The assistant isn’t connected yet
              </p>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                The chat endpoint hasn’t been built on the backend. Everything else in CampusPal
                works — Explore and Food are live.
              </p>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form
          onSubmit={submit}
          className="flex items-center gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800"
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about campus…"
            aria-label="Message the assistant"
            className="w-full rounded-full bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        </form>
      </aside>
    </div>
  );
}
