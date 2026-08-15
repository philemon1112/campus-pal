import { MessageSquare, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { assistantApi } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { useAssistant } from '@/hooks/useAssistant';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/format';

// FR-3.8 — recent AI chat sessions, for signed-in users.
// SRS 6.2 — with an option to clear them.
//
// Only sessions from signed-in turns appear here: a guest's conversation has
// no owner server-side, so asking without an account leaves no history.
export function AssistantHistoryPage() {
  const { openPanel } = useAssistant();
  const { data, status, retry } = useApiResource(() => assistantApi.listSessions$());
  const [deleting, setDeleting] = useState<string | null>(null);
  const sessions = data?.results ?? [];

  function remove(id: string) {
    setDeleting(id);
    assistantApi.deleteSession$(id).subscribe({
      next: () => retry(),
      error: () => setDeleting(null),
      complete: () => setDeleting(null),
    });
  }

  return (
    <div className="md:mx-auto md:max-w-3xl md:px-6 lg:px-8">
      <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">
            Past conversations
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Everything you’ve asked CampusPal.
          </p>
        </div>
        <button
          type="button"
          onClick={openPanel}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Sparkles className="size-4" /> Ask
        </button>
      </header>

      <section className="px-5 pb-4 md:px-0">
        {status === 'error' && (
          <div className="flex items-center justify-between gap-3 rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn’t load your conversations.</span>
            <button
              type="button"
              onClick={retry}
              className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {status === 'loading' && (
          <SkeletonRegion label="Loading conversations" className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-card border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-2/3" />
                  <SkeletonLine className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && sessions.length === 0 && (
          <div className="rounded-card border border-dashed border-neutral-200 px-5 py-10 text-center dark:border-neutral-800">
            <MessageSquare className="mx-auto size-8 text-neutral-300 dark:text-neutral-700" />
            <p className="mt-3 text-sm font-medium text-ink-900 dark:text-white">
              No conversations yet
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Ask about a lecture hall, a department or somewhere to eat.
            </p>
          </div>
        )}

        {status === 'ready' && sessions.length > 0 && (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-3 rounded-card border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${
                  deleting === session.id ? 'opacity-50' : ''
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500">
                  <MessageSquare className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink-900 dark:text-white">
                    {/* `title` is the first message, trimmed — a session
                        that never got one is still worth listing. */}
                    {session.title ?? 'Untitled conversation'}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {formatDate(session.updatedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(session.id)}
                  aria-label={`Delete “${session.title ?? 'Untitled conversation'}”`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-danger-500 dark:hover:bg-neutral-800"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
