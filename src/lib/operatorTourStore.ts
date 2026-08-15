import type { Tour } from '@/lib/api';

// Remembers tours this browser created, keyed by operator id.
//
// Why this exists: GET /tours and GET /tours/:slug both return APPROVED
// tours only, and there is no GET /tours/mine (see docs/API_REQUIREMENTS.md).
// So the moment an operator creates a tour it becomes unreadable -- it's a
// DRAFT -- and they'd have no way to submit it for review or add departures
// to it. Holding onto the response the API actually returned is the only
// way to keep the lifecycle usable from the frontend today.
//
// This stores nothing the server didn't send; it is not mock data. It IS
// device-local, so the operator console labels it plainly rather than
// implying it's a complete list. Delete this file once the backend ships a
// real "my tours" endpoint.

const STORAGE_KEY = 'tms.operator.tours';

type Store = Record<string, Tour[]>;

function readStore(): Store {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getRememberedTours(operatorId: string): Tour[] {
  return readStore()[operatorId] ?? [];
}

// Upsert by id, newest first — used both for the initial create and for
// every subsequent response (update, submit, approve, suspend) so the card
// always shows the tour's real current status.
export function rememberTour(operatorId: string, tour: Tour): Tour[] {
  const store = readStore();
  const existing = store[operatorId] ?? [];
  const next = [tour, ...existing.filter((t) => t.id !== tour.id)];
  store[operatorId] = next;
  writeStore(store);
  return next;
}

export function forgetTour(operatorId: string, tourId: string): Tour[] {
  const store = readStore();
  const next = (store[operatorId] ?? []).filter((t) => t.id !== tourId);
  store[operatorId] = next;
  writeStore(store);
  return next;
}
