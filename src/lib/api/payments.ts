import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toMinorUnits } from './money';
import type { InitiatePaymentInput, Payment } from './types';

// Verified against a real response (booking TUR-2026-0005): authorizationUrl
// correctly redirects to a live Paystack test-mode checkout for the right
// amount/customer. The earlier 500 (see docs/DEVELOPMENT_LOG.md) appears to
// have been intermittent rather than a hard bug -- worth keeping an eye on.
export interface InitiatePaymentResult {
  authorizationUrl: string;
  reference: string;
  accessCode?: string;
}

export function initiatePayment$(input: InitiatePaymentInput): Observable<InitiatePaymentResult> {
  return apiRequest$<InitiatePaymentResult>('/payments/initiate', { method: 'POST', body: input });
}

// Same major-vs-minor units mismatch as tours/bookings (see money.ts): the
// live response sends `amount: 80`, not `amountMinor: 8000`.
type RawPayment = Omit<Payment, 'amountMinor'> & { amountMinor?: number; amount?: number };

export function verifyPayment$(reference: string): Observable<Payment> {
  return apiRequest$<RawPayment>(`/payments/${reference}/verify`).pipe(
    map((raw) => ({ ...raw, amountMinor: toMinorUnits(raw.amountMinor, raw.amount) })),
  );
}
