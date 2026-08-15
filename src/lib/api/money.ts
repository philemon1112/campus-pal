// Reconciles a live-API/spec mismatch on money fields.
//
// The integration guide documents integer MINOR units -- `priceMinor: 12000`
// meaning GHS 120.00 -- but the running backend returns MAJOR units under
// shorter names: tours send `price: 80`, bookings send `total: 80`. Reading
// the documented field off the real response therefore yields `undefined`,
// and formatMoney rendered a literal "GHSNaN" on the tour detail, trips and
// booking detail screens.
//
// Normalising here, at the edge, means the rest of the app keeps using the
// guide's names and units, and nothing has to change when the backend
// starts sending the documented fields -- whichever arrives, minor units
// come out. Delete the fallback branch once the API matches its own spec.
export function toMinorUnits(minor: number | undefined, major: number | undefined): number {
  if (typeof minor === 'number') return minor;
  if (typeof major === 'number') return Math.round(major * 100);
  return 0;
}

// Same conversion for genuinely optional amounts (itinerary budgets and
// per-item cost estimates), where "absent" has to stay absent rather than
// collapsing to 0 — the UI hides the price entirely when it's undefined.
export function toOptionalMinorUnits(
  minor: number | undefined,
  major: number | undefined,
): number | undefined {
  if (typeof minor === 'number') return minor;
  if (typeof major === 'number') return Math.round(major * 100);
  return undefined;
}
