import { CheckCircle2, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { throwError } from 'rxjs';
import { paymentsApi } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { ROUTES } from '@/lib/routes';

// Where Paystack redirects after checkout. We don't control the backend's
// configured callback_url (InitiatePaymentDto has no field for it), so
// this route is a best guess — BookingDetailPage's manual "I've already
// paid" verify button is the resilient fallback if Paystack redirects
// somewhere else instead. See docs/DEVELOPMENT_LOG.md.
export function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref');

  const { status } = useApiResource(() => {
    if (!reference) return throwError(() => new Error('Missing payment reference'));
    return paymentsApi.verifyPayment$(reference);
  });

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-5 py-16 text-center">
      {status === 'loading' && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Confirming your payment…</p>
      )}
      {status === 'ready' && (
        <>
          <CheckCircle2 className="size-12 text-brand-600" />
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Payment received</h1>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="size-12 text-danger-500" />
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">
            Couldn't confirm payment
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            If you completed checkout, check your booking status.
          </p>
        </>
      )}
      {reference && (
        <Link
          to={`${ROUTES.bookings}/${reference}`}
          className="mt-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
        >
          View booking
        </Link>
      )}
    </div>
  );
}
