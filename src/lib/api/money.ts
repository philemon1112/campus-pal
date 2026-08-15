// Normalises the API's money fields to minor units at the boundary.
//
// The API's unit is DECIMAL CEDIS under short names: a menu item sends
// `price: 25` meaning GHS 25.00, with at most two decimal places. That is
// the documented contract, not a bug — an older revision of the API guide
// described integer minor units (`priceMinor`), which is why this accepts
// either and why the rest of the app works in one unit regardless.
//
// Converting here rather than at each call site means formatMoney only ever
// sees minor units, so a field arriving in the other shape can't render as
// "GHS NaN" or silently 100x itself.
export function toMinorUnits(minor: number | undefined, major: number | undefined): number {
  if (typeof minor === 'number') return minor;
  if (typeof major === 'number') return Math.round(major * 100);
  return 0;
}
