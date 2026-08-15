import { createContext, useContext } from 'react';
import type { AssistantMessage } from '@/lib/api';

// Context and hook live here, separate from the <AssistantProvider>
// component in src/lib/assistant.tsx, so that file exports only a component
// — otherwise Vite's Fast Refresh can't hot-reload it. Same split as
// useAuth.ts / auth.tsx.

// FR-3.1: the assistant is reachable from every page, so its open/closed
// state has to live above the router rather than inside any one screen.
// FR-3.7: `sessionId` is held here too, so follow-up questions keep their
// context as the user navigates between pages mid-conversation.
export interface AssistantState {
  open: boolean;
  messages: AssistantMessage[];
  // True from the moment a message is sent until the stream completes —
  // streamed prose lands in the transcript while this is still true.
  sending: boolean;
  // Inline error for the last send. Never blanks the transcript.
  error: string | null;
  openPanel: () => void;
  closePanel: () => void;
  send: (message: string) => void;
  clear: () => void;
}

export const AssistantContext = createContext<AssistantState | null>(null);

export function useAssistant(): AssistantState {
  const context = useContext(AssistantContext);
  if (!context) throw new Error('useAssistant must be used inside <AssistantProvider>');
  return context;
}
