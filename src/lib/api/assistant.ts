import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';
import type {
  ApiPage,
  AssistantMessage,
  AssistantReply,
  AssistantSession,
  SendMessageInput,
} from './types';

// AI assistant (SRS 3.3, FR-3.1 to FR-3.8).
//
// ⚠️ NONE of these endpoints exist on the backend yet — specced in
// docs/API_REQUIREMENTS.md §C. The chat panel is fully built against this
// contract and shows an honest "not connected yet" state; it does not
// simulate a conversation.
//
// Two properties of the contract are load-bearing and worth restating here,
// because they are easy to lose in a backend implementation:
//
//  1. `POST /assistant/chat` must accept an UNAUTHENTICATED caller. SRS 6.1
//     makes Chat Session.User ID nullable and FR-4.1 allows browsing without
//     an account, so a guest has to be able to ask "where is Balme Library?"
//     `auth: false` below is deliberate — the bearer token is attached when
//     one exists (see client.ts) but its absence is not an error.
//  2. The reply's `actions[]` is a closed, typed union (see types.ts). That
//     is what makes FR-3.5 real: the client performs the action, so it has
//     to be something a switch statement can execute.
//
// NFR-3 asks for a first response in 3-5s. This is a plain POST, so a slow
// model shows as a slow request; `timeoutMs` caps it rather than letting a
// hung fetch spin forever (browser fetch has no default timeout). If the
// backend adds SSE streaming, this is the function that changes.
const CHAT_TIMEOUT_MS = 45_000;

export function sendMessage$(input: SendMessageInput): Observable<AssistantReply> {
  return apiRequest$<AssistantReply>('/assistant/chat', {
    method: 'POST',
    body: input,
    auth: false,
    timeoutMs: CHAT_TIMEOUT_MS,
  });
}

// --- History (FR-3.8) — signed-in users only ---

export function listSessions$(): Observable<ApiPage<AssistantSession>> {
  return apiRequest$<ApiPage<AssistantSession>>('/assistant/sessions', {
    query: { limit: 50 },
  });
}

export function getSession$(id: string): Observable<{ id: string; messages: AssistantMessage[] }> {
  return apiRequest$<{ id: string; messages: AssistantMessage[] }>(`/assistant/sessions/${id}`);
}

// SRS 6.2: chat history is retained only for users who opt in, with an
// option to clear it.
export function deleteSession$(id: string): Observable<null> {
  return apiRequest$<null>(`/assistant/sessions/${id}`, { method: 'DELETE' });
}
