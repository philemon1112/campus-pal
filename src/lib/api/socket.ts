import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { API_BASE_URL } from './client';
import { getTokens } from './tokenStore';
import type { BookingStatus } from './types';

// Real-time updates over Socket.IO. Not in Swagger — the contract comes
// from the backend integration guide (§8).
//
// Exposed as cold Observables rather than raw sockets so real-time matches
// the RxJS convention the rest of src/lib/api/ uses: nothing connects until
// something subscribes, and unsubscribing tears the connection down. That
// makes them safe to drive straight from a useEffect.
//
// Treat these as an *enhancement* everywhere they're used. REST stays the
// source of truth — a socket that never connects must degrade silently,
// never blank a screen.
//
// Known limitation: the handshake carries whatever access token was current
// at connect time. If it expires mid-session the server drops the
// connection; reconnect attempts re-read the store, but a socket won't
// itself trigger the REST refresh-and-retry flow in client.ts.

export interface BookingStatusEvent {
  reference: string;
  status: BookingStatus;
  changedAt: string;
}

export interface AvailabilityEvent {
  departureId: string;
  seatsLeft: number;
  capacity: number;
}

// Socket.IO needs an absolute-or-same-origin URL. API_BASE_URL is '' in dev,
// which resolves same-origin and so rides the Vite /socket.io proxy
// (vite.config.ts); in production it's the real backend host.
function namespaceUrl(namespace: string): string {
  return `${API_BASE_URL}${namespace}`;
}

function connect(namespace: string) {
  // Read the token at subscribe time, not module load — the user may have
  // logged in since this module was first imported.
  return io(namespaceUrl(namespace), {
    auth: { token: getTokens()?.accessToken },
    transports: ['websocket', 'polling'],
  });
}

// Booking status for the signed-in user. Auth is required — an
// unauthenticated handshake is disconnected immediately. The server
// auto-joins the user's own room on connect, so there's nothing to
// subscribe to; every event that arrives is already for this user.
// Emitted only after the DB transaction commits, so status is authoritative.
export function bookingStatus$(): Observable<BookingStatusEvent> {
  return new Observable<BookingStatusEvent>((subscriber) => {
    const socket = connect('/bookings');

    socket.on('booking.status_changed', (event: BookingStatusEvent) => subscriber.next(event));
    socket.on('connect_error', (err: Error) => subscriber.error(err));

    return () => socket.disconnect();
  });
}

// Live seat counts for one departure. Unlike /bookings this is opt-in per
// departure, so the subscription is sent on connect and withdrawn on
// teardown before disconnecting.
export function departureAvailability$(departureId: string): Observable<AvailabilityEvent> {
  return new Observable<AvailabilityEvent>((subscriber) => {
    const socket = connect('/availability');

    socket.on('connect', () => socket.emit('departure.subscribe', { departureId }));
    socket.on('connect_error', (err: Error) => subscriber.error(err));
    socket.on('availability.changed', (event: AvailabilityEvent) => {
      // The namespace is shared, so filter to the departure we asked for.
      if (event.departureId === departureId) subscriber.next(event);
    });

    return () => {
      if (socket.connected) socket.emit('departure.unsubscribe', { departureId });
      socket.disconnect();
    };
  });
}
