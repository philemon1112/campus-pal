import { Observable, type Subscriber } from 'rxjs';
import { apiRequest$, apiUrl, ApiError } from './client';
import { getTokens } from './tokenStore';
import type {
  ApiEnvelope,
  ApiPage,
  AssistantReply,
  AssistantSession,
  AssistantSessionDetail,
  SendMessageInput,
} from './types';

// AI assistant (SRS 3.3, FR-3.1 to FR-3.8).
//
// Two properties of the contract are load-bearing:
//
//  1. Chat accepts an UNAUTHENTICATED caller. SRS 6.1 makes Chat Session.
//     User ID nullable and FR-4.1 allows browsing without an account, so a
//     guest can ask "where is Balme Library?" and gets a real `sessionId`
//     back to continue with. `auth: false` is deliberate — the bearer token
//     is attached when one exists (see client.ts) but its absence is not an
//     error. Guest sessions have no owner, so they never appear in history.
//  2. `actions[]` is a closed, typed union (see types.ts) that the server
//     validates against real records before sending. That is what makes
//     FR-3.5 real: the client performs the action, so it has to be something
//     a switch statement can execute.

// NFR-3 asks for a first response in 3-5s; the backend measures 9-16s to
// first token and up to ~120s for a full turn on its current model. That is
// why the chat panel streams (below) rather than waiting on a single POST.
// This non-streaming path remains as the fallback and gets a cap generous
// enough to cover a slow turn — browser fetch has no default timeout, so
// without one a hung request spins forever.
const CHAT_TIMEOUT_MS = 130_000;

// If the stream produces nothing at all within this window, something is
// wrong upstream — surface it rather than leaving the composer spinning.
const STREAM_FIRST_EVENT_TIMEOUT_MS = 45_000;

export function sendMessage$(input: SendMessageInput): Observable<AssistantReply> {
  return apiRequest$<AssistantReply>('/assistant/chat', {
    method: 'POST',
    body: input,
    auth: false,
    timeoutMs: CHAT_TIMEOUT_MS,
  });
}

// --- Streaming (SSE) ---

// Each `delta` carries the WHOLE reply so far, not a fragment to append —
// so the consumer replaces its draft text rather than concatenating.
// Only `done` is grounded: buttons and cards must be driven off its actions
// and results, never off streamed prose that may still be in flight.
export type ChatStreamEvent =
  | { kind: 'delta'; reply: string }
  | { kind: 'done'; reply: AssistantReply };

interface SseFrame {
  event: string;
  data: string;
}

// Splits an SSE buffer into complete frames, returning the leftover tail.
function drainFrames(buffer: string): { frames: SseFrame[]; rest: string } {
  const frames: SseFrame[] = [];
  const chunks = buffer.split('\n\n');
  // The last chunk is whatever hasn't been terminated by a blank line yet.
  const rest = chunks.pop() ?? '';

  for (const chunk of chunks) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length > 0) frames.push({ event, data: dataLines.join('\n') });
  }
  return { frames, rest };
}

// An `error` frame ends the turn, so it throws rather than emitting; the
// stream's catch turns it into the Observable's error.
function emitFrame(frame: SseFrame, subscriber: Subscriber<ChatStreamEvent>): void {
  switch (frame.event) {
    case 'delta': {
      const payload = JSON.parse(frame.data) as { reply: string };
      return subscriber.next({ kind: 'delta', reply: payload.reply });
    }
    case 'done':
      return subscriber.next({ kind: 'done', reply: JSON.parse(frame.data) as AssistantReply });
    case 'error': {
      const payload = JSON.parse(frame.data) as { message?: string };
      throw new ApiError(502, payload.message ?? 'The assistant is unavailable');
    }
  }
}

// Unlike every other call in this layer, SSE frames are NOT enveloped — the
// payload is the frame's own JSON. Errors before the stream opens still come
// back as a normal envelope, so those are unwrapped as usual.
//
// Written as a hand-rolled Observable rather than via fromFetch because the
// body has to be read incrementally; unsubscribing aborts the request, so a
// closed panel doesn't leave a model generating into nothing.
export function streamMessage$(input: SendMessageInput): Observable<ChatStreamEvent> {
  return new Observable<ChatStreamEvent>((subscriber) => {
    const controller = new AbortController();
    let settled = false;

    const firstEventTimer = setTimeout(() => {
      if (!settled) {
        controller.abort();
        subscriber.error(new ApiError(408, 'Request timed out'));
      }
    }, STREAM_FIRST_EVENT_TIMEOUT_MS);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    const tokens = getTokens();
    // Optional: a token makes the session show up in history, its absence is
    // not an error.
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;

    void (async () => {
      try {
        const response = await fetch(apiUrl('/assistant/chat/stream'), {
          method: 'POST',
          headers,
          body: JSON.stringify(input),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const envelope = (await response.json().catch(() => null)) as ApiEnvelope<null> | null;
          throw new ApiError(
            envelope?.code ?? response.status,
            envelope?.message ?? response.statusText,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          settled = true;
          clearTimeout(firstEventTimer);

          buffer += decoder.decode(value, { stream: true });
          const { frames, rest } = drainFrames(buffer);
          buffer = rest;

          for (const frame of frames) emitFrame(frame, subscriber);
        }
        subscriber.complete();
      } catch (err) {
        // An abort is the consumer unsubscribing, not a failure.
        if (controller.signal.aborted) return;
        subscriber.error(
          err instanceof ApiError ? err : new ApiError(0, "Couldn't reach the assistant."),
        );
      } finally {
        clearTimeout(firstEventTimer);
      }
    })();

    return () => {
      clearTimeout(firstEventTimer);
      controller.abort();
    };
  });
}

// --- History (FR-3.8) — signed-in users only ---

export function listSessions$(): Observable<ApiPage<AssistantSession>> {
  return apiRequest$<ApiPage<AssistantSession>>('/assistant/sessions', {
    query: { limit: 50 },
  });
}

// A session id you don't own is a 404, not a 403 — the response never
// confirms that someone else's session exists.
export function getSession$(id: string): Observable<AssistantSessionDetail> {
  return apiRequest$<AssistantSessionDetail>(`/assistant/sessions/${id}`);
}

// SRS 6.2: chat history is retained only for users who opt in, with an
// option to clear it.
export function deleteSession$(id: string): Observable<null> {
  return apiRequest$<null>(`/assistant/sessions/${id}`, { method: 'DELETE' });
}
