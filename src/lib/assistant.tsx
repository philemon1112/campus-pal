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

// A local id for optimistic user messages and for the streaming reply. The
// server owns ids for anything it returns; this only has to be unique
// within one transcript.
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

    // The assistant's reply is streamed into this one message, which is
    // appended empty and then rewritten in place as deltas arrive.
    const replyId = nextLocalId();
    setMessages((prev) => [
      ...prev,
      {
        id: nextLocalId(),
        role: 'USER',
        content: body,
        createdAt: new Date().toISOString(),
      },
    ]);

    function upsertReply(patch: Partial<AssistantMessage>) {
      setMessages((prev) => {
        const index = prev.findIndex((message) => message.id === replyId);
        if (index === -1) {
          return [
            ...prev,
            {
              id: replyId,
              role: 'ASSISTANT',
              content: '',
              createdAt: new Date().toISOString(),
              ...patch,
            },
          ];
        }
        const next = [...prev];
        next[index] = { ...next[index], ...patch };
        return next;
      });
    }

    // NFR-3 wants a first response in 3-5s and the model takes 9-16s to
    // first token, so the panel streams: prose appears as it is generated
    // instead of after the whole turn. Only the `done` frame is grounded,
    // so actions and result cards are written from it alone — never from
    // streamed text that may still be in flight.
    subscription.current = assistantApi.streamMessage$({
      sessionId: sessionId.current,
      message: body,
    }).subscribe({
      next: (event) => {
        if (event.kind === 'delta') {
          // Each delta carries the whole reply so far, so this replaces
          // rather than appends.
          upsertReply({ content: event.reply });
          return;
        }
        sessionId.current = event.reply.sessionId;
        upsertReply({
          content: event.reply.reply,
          actions: event.reply.actions,
          results: event.reply.results,
        });
      },
      error: (err: unknown) => {
        setSending(false);
        // Drop the empty placeholder so a failed turn doesn't leave a blank
        // bubble above the error.
        setMessages((prev) =>
          prev.filter((message) => message.id !== replyId || message.content !== ''),
        );
        setError(
          err instanceof ApiError && err.code === 408
            ? 'That took too long. Try asking again.'
            : err instanceof ApiError
              ? err.message
              : "Couldn't reach the assistant.",
        );
      },
      complete: () => setSending(false),
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
    () => ({ open, messages, sending, error, openPanel, closePanel, send, clear }),
    [open, messages, sending, error, openPanel, closePanel, send, clear],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
