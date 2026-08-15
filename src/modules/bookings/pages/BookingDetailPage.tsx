import { CheckCircle2, Clock, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { throwError } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ApiError, bookingsApi, paymentsApi, socketApi } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { SkeletonCircle, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { WriteReview } from '@/modules/bookings/components/WriteReview';
import { formatMoney } from '@/lib/format';

// Reached right after creating a booking (TourDetailPage) or later from
// the Bookings list. No Figma screen exists for this — see
// docs/DEVELOPMENT_LOG.md. Handles the Paystack handoff: initiating a
// payment redirects the browser to Paystack's hosted checkout page. We
// don't control the backend's configured callback_url, so this page also
// offers a manual "I've paid" verify action as a resilient fallback.
//
// Payment confirmation is asynchronous: Paystack calls the backend's
// webhook server-to-server, so no request this page makes ever returns the
// confirmation directly. The /bookings socket is what closes that loop —
// see the booking.status_changed effect below.
export function BookingDetailPage() {
  const { reference } = useParams<{ reference: string }>();
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  // Set once checkout has been opened in the other tab — drives the
  // "finish in the other tab, then come back" panel below.
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: bookingResource, status, retry } = useApiResource(() => {
    if (!reference) return throwError(() => new Error('Missing booking reference'));
    return bookingsApi.getBooking$(reference);
  });

  // Keep the effect below off retry's identity — useApiResource returns a
  // fresh `load` closure each render, which would otherwise reconnect the
  // socket on every state change.
  const retryRef = useRef(retry);
  retryRef.current = retry;

  // Live PENDING -> CONFIRMED (and -> CANCELLED on hold expiry, -> COMPLETED
  // after the trip). The event is authoritative, but refetching over REST
  // keeps a single source of truth and reuses all the rendering below
  // unchanged. Purely additive: if the socket never connects, the manual
  // verify button still works.
  useEffect(() => {
    if (!reference) return;
    const subscription = socketApi.bookingStatus$().subscribe({
      next: (event) => {
        if (event.reference === reference) retryRef.current();
      },
      // A dead socket must not disturb the page — REST already rendered it.
      error: () => {},
    });
    return () => subscription.unsubscribe();
  }, [reference]);

  // Coming back from the Paystack tab should just work, even if the socket
  // never connected. Refetching on tab-focus covers that without polling.
  useEffect(() => {
    if (!awaitingPayment) return;
    function onVisible() {
      if (document.visibilityState === 'visible') retryRef.current();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [awaitingPayment]);

  // Paystack checkout opens in a SEPARATE tab so this page stays alive
  // behind it — the user pays there, comes back to this tab, and sees the
  // status update (pushed over the socket, or via "Check status").
  //
  // The tab has to be opened synchronously inside the click handler. By the
  // time initiatePayment$ resolves we're outside the user-gesture window and
  // popup blockers reject window.open, so a blank tab is opened up front and
  // pointed at the real URL once it arrives. `noopener` isn't passed because
  // it makes window.open return null; the opener is severed manually instead.
  function handlePay() {
    if (!reference) return;
    const payWindow = window.open('', '_blank');
    if (payWindow) payWindow.opener = null;

    setPaying(true);
    setPayError(null);
    setAwaitingPayment(false);
    setCheckoutUrl(null);

    paymentsApi.initiatePayment$({ bookingReference: reference }).subscribe({
      next: (result) => {
        setPaying(false);
        setAwaitingPayment(true);
        // Kept either way: it backs the manual link shown when the popup was
        // blocked, and lets the user reopen checkout without paying twice.
        setCheckoutUrl(result.authorizationUrl);
        if (payWindow && !payWindow.closed) {
          payWindow.location.replace(result.authorizationUrl);
        }
      },
      error: (err: unknown) => {
        payWindow?.close();
        setPayError(err instanceof ApiError ? err.message : 'Could not start payment.');
        setPaying(false);
      },
    });
  }

  function handleCancel() {
    if (!reference) return;
    setCanceling(true);
    setCancelError(null);
    bookingsApi.cancelBooking$(reference).subscribe({
      next: () => {
        setConfirmingCancel(false);
        setCanceling(false);
        retry();
      },
      error: (err: unknown) => {
        setCancelError(err instanceof ApiError ? err.message : 'Could not cancel booking.');
        setCanceling(false);
      },
    });
  }

  function handleVerify() {
    if (!reference) return;
    setVerifying(true);
    paymentsApi
      .verifyPayment$(reference)
      .pipe(finalize(() => setVerifying(false)))
      .subscribe({
        // Verify is best-effort here; refetching the booking below is the
        // real source of truth regardless of whether this call succeeded.
        next: retry,
        error: retry,
      });
  }

  // Shell-first: the status block, the summary card frame and its three
  // static row labels all paint immediately; only the values resolve.
  const booking = bookingResource;

  return (
    <div className="px-5 py-6 md:mx-auto md:max-w-md md:py-12">
      <div className="mb-5 flex flex-col items-center text-center">
        {!booking ? (
          <SkeletonCircle className="mb-2 size-12" />
        ) : booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' ? (
          <CheckCircle2 className="mb-2 size-12 text-brand-600" />
        ) : booking.status === 'CANCELLED' ? (
          <XCircle className="mb-2 size-12 text-danger-500" />
        ) : (
          <Clock className="mb-2 size-12 text-accent-500" />
        )}

        {booking ? (
          <>
            <h1 className="text-xl font-bold text-ink-900 dark:text-white">
              {booking.status === 'PENDING' && 'Payment pending'}
              {booking.status === 'CONFIRMED' && 'Booking confirmed'}
              {booking.status === 'COMPLETED' && 'Trip completed'}
              {booking.status === 'CANCELLED' && 'Booking cancelled'}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{booking.reference}</p>
          </>
        ) : (
          // h-7 matches text-xl's line box; the reference line is text-sm.
          <SkeletonRegion label="Loading booking" className="flex flex-col items-center">
            <SkeletonLine boxClassName="h-7" className="w-44" />
            <SkeletonLine className="w-28" />
          </SkeletonRegion>
        )}
      </div>

      {/* Row labels are static — they never wait on the fetch, so only the
          right-hand values swap in and the card never changes height. */}
      <div className="space-y-3 rounded-card border border-neutral-100 p-4 dark:border-neutral-800">
        {(['Seats', 'Total', 'Status'] as const).map((label) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
            {booking ? (
              <span className="font-medium text-ink-900 dark:text-white">
                {label === 'Seats' && booking.seats}
                {label === 'Total' && formatMoney(booking.totalMinor, booking.currency)}
                {label === 'Status' && booking.status}
              </span>
            ) : (
              <SkeletonLine className={label === 'Total' ? 'w-24' : 'w-16'} />
            )}
          </div>
        ))}
      </div>

      {status === 'error' && (
        <div className="mt-4 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span>Couldn't load this booking.</span>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {payError && <p className="mt-3 text-sm text-danger-500">{payError}</p>}

      {booking?.status === 'PENDING' && (
        <div className="mt-5 space-y-3">
          {awaitingPayment ? (
            <div className="space-y-3 rounded-card border border-brand-500/30 bg-brand-50 p-4 dark:bg-brand-700/15">
              <div className="flex items-start gap-2">
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-500" />
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">
                    Complete your payment in the other tab
                  </p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                    Come back here when you're done — this page updates on its own once Paystack
                    confirms. You can leave it open.
                  </p>
                </div>
              </div>

              {/* Shown when the browser blocked the popup, and as a way back
                  to checkout if the tab was closed by accident. */}
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  <ExternalLink className="size-4" /> Open the payment page again
                </a>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {paying ? (
                <>
                  <RefreshCw className="size-4 animate-spin" /> Opening Paystack…
                </>
              ) : (
                <>
                  <ExternalLink className="size-4" /> Pay with Paystack
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-neutral-500 dark:text-neutral-400"
          >
            <RefreshCw className={`size-4 ${verifying ? 'animate-spin' : ''}`} />
            {awaitingPayment ? 'Check payment status now' : "I've already paid — check status"}
          </button>
        </div>
      )}

      {/* Reviews are only accepted for COMPLETED bookings, so this appears
          exactly when the trip has actually happened. */}
      {booking?.status === 'COMPLETED' && reference && <WriteReview reference={reference} />}

      {(booking?.status === 'PENDING' || booking?.status === 'CONFIRMED') && (
        <div className="mt-5">
          {cancelError && <p className="mb-3 text-sm text-danger-500">{cancelError}</p>}
          {confirmingCancel ? (
            <div className="space-y-3 rounded-card border border-danger-500/30 bg-danger-500/5 p-4">
              <p className="text-sm text-ink-900 dark:text-white">
                Cancel this booking? This can't be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={canceling}
                  className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-400"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={canceling}
                  className="flex-1 rounded-xl bg-danger-500 py-2.5 text-sm font-semibold text-white transition hover:bg-danger-600 disabled:opacity-60"
                >
                  {canceling ? 'Cancelling…' : 'Yes, cancel'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="w-full text-sm font-medium text-danger-500"
            >
              Cancel booking
            </button>
          )}
        </div>
      )}
    </div>
  );
}
