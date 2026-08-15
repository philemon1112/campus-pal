// Reconciles a live-API/spec mismatch on money fields.
//
// The API's own guide documents integer MINOR units -- `priceMinor: 12000`
// meaning GHS 120.00 -- but the running backend returns MAJOR units under
// shorter names: a menu item sends `price: 25`, not `priceMinor: 2500`.
// Reading the documented field off a real response therefore yields
// `undefined`, and formatMoney renders a literal "GHSNaN".
//
// Normalising here, at the edge, means the rest of the app works in one
// unit, and nothing has to change when the backend starts sending the
// documented fields -- whichever arrives, minor units come out. Delete the
// fallback branch once the API matches its own spec.
//
// CampusPal shows money in exactly one place (food-joint menus), but the
// mismatch is a property of the API rather than of that screen, so it stays
// handled at the boundary.
export function toMinorUnits(minor: number | undefined, major: number | undefined): number {
  if (typeof minor === 'number') return minor;
  if (typeof major === 'number') return Math.round(major * 100);
  return 0;
}
