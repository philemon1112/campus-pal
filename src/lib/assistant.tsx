import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Subscription } from 'rxjs';
import { ApiError, assistantApi, type AssistantMessage } from '@/lib/api';
import { AssistantContext } from '@/hooks/useAssistant';

// Owns the assistant conversation for the whole app (SRS 3.3).
//
// It lives above the router because FR-3.1 requires the assistant to be
// reachable from every page and FR-3.7 requires follow-up questions to keep
// their context — if this state lived in the panel, navigating to a result
// would unmount the conversation that produced it.
//
// The context and hook are in src/hooks/useAssistant.ts so this file
// exports only a component (Fast Refresh requirement).

// A local id for optimistic user messages. The server owns ids for anything
// it returns; this only has to be unique within one transcript.
let localId = 0;
function nextLocalId(): string {
  localId += 1;
  return `local-${localId}`;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // FR-3.7 — the server keys conversation context off this. Held in a ref
  // rather than state because nothing renders it and a change must not
  // re-render the whole tree mid-conversation.
  const sessionId = useRef<string | undefined>(undefined);
  const subscription = useRef<Subscription | null>(null);

  useEffect(() => () => subscription.current?.unsubscribe(), []);

  const send = useCallback((text: string) => {
    const body = text.trim();
    if (!body) return;

    subscription.current?.unsubscribe();
    setError(null);
    setSending(true);
    setMessages((prev) => [
      ...prev,
      {
        id: nextLocalId(),
        role: 'user',
        content: body,
        createdAt: new Date().toISOString(),
      },
    ]);

    subscription.current = assistantApi
      .sendMessage$({ sessionId: sessionId.current, message: body })
      .subscribe({
        next: (reply) => {
          sessionId.current = reply.sessionId;
          setMessages((prev) => [
            ...prev,
            {
              id: nextLocalId(),
              role: 'assistant',
              content: reply.reply,
              createdAt: new Date().toISOString(),
              actions: reply.actions,
              results: reply.results,
            },
          ]);
          setSending(false);
        },
        error: (err: unknown) => {
          setSending(false);
          // A 404/501 is categorically different from a transient failure:
          // it means the endpoint isn't built, so retrying is pointless and
          // the panel should say so once instead of offering Retry forever.
          if (err instanceof ApiError && (err.code === 404 || err.code === 501)) {
            setUnavailable(true);
            return;
          }
          setError(
            err instanceof ApiError && err.code === 408
              ? 'That took too long. Try asking again.'
              : err instanceof ApiError
                ? err.message
                : "Couldn't reach the assistant.",
          );
        },
      });
  }, []);

  const clear = useCallback(() => {
    subscription.current?.unsubscribe();
    sessionId.current = undefined;
    setMessages([]);
    setError(null);
    setSending(false);
  }, []);

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, messages, sending, error, unavailable, openPanel, closePanel, send, clear }),
    [open, messages, sending, error, unavailable, openPanel, closePanel, send, clear],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
