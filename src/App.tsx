import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { TripsPage } from '@/pages/TripsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PersonalInfoPage } from '@/pages/PersonalInfoPage';
import { EmergencyContactsPage } from '@/pages/EmergencyContactsPage';
import { ExplorePage } from '@/modules/tours/pages/ExplorePage';
import { TourDetailPage } from '@/modules/tours/pages/TourDetailPage';
import { FlightSearchPage } from '@/modules/flights/pages/FlightSearchPage';
import { FlightResultsPage } from '@/modules/flights/pages/FlightResultsPage';
import { AccommodationSearchPage } from '@/modules/accommodation/pages/AccommodationSearchPage';
import { AccommodationDetailPage } from '@/modules/accommodation/pages/AccommodationDetailPage';
import { FoodDiscoverPage } from '@/modules/food/pages/FoodDiscoverPage';
import { RestaurantDetailPage } from '@/modules/food/pages/RestaurantDetailPage';
import { TransportBookingPage } from '@/modules/transport/pages/TransportBookingPage';
import { ActiveRidePage } from '@/modules/transport/pages/ActiveRidePage';
import { EmergencyPage } from '@/modules/emergency/pages/EmergencyPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { RegisterPage } from '@/modules/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage';
import { BookingDetailPage } from '@/modules/bookings/pages/BookingDetailPage';
import { ItinerariesPage } from '@/modules/itineraries/pages/ItinerariesPage';
import { ItineraryDetailPage } from '@/modules/itineraries/pages/ItineraryDetailPage';
import { PaymentCallbackPage } from '@/modules/payments/pages/PaymentCallbackPage';
import { OperatorToursPage } from '@/modules/operator/pages/OperatorToursPage';
import { AdminModerationPage } from '@/modules/admin/pages/AdminModerationPage';
import { AdminDestinationsPage } from '@/modules/admin/pages/AdminDestinationsPage';
import { RoleGate } from '@/components/layout/RoleGate';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { ROUTES } from '@/lib/routes';

function App() {
  return (
    <>
      {/* Above Routes so it also covers the auth screens, which render
          outside AppLayout. */}
      <ScrollToTop />
      <Routes>
      {/* Emergency is the ONE signed-out page inside the shell: it must work
          with an expired session (SRS FR-EMRG-08), and its endpoints are
          public for exactly that reason. Everything else requires a login. */}
      <Route element={<AppLayout />}>
        <Route path={ROUTES.emergency} element={<EmergencyPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.explore} element={<ExplorePage />} />
        <Route path={`${ROUTES.explore}/:slug`} element={<TourDetailPage />} />
        <Route path={ROUTES.flights} element={<FlightSearchPage />} />
        <Route path={ROUTES.flightResults} element={<FlightResultsPage />} />
        <Route path={ROUTES.hotels} element={<AccommodationSearchPage />} />
        <Route path={`${ROUTES.hotels}/:slug`} element={<AccommodationDetailPage />} />
        <Route path={ROUTES.food} element={<FoodDiscoverPage />} />
        <Route path={`${ROUTES.food}/:slug`} element={<RestaurantDetailPage />} />
        <Route path={ROUTES.transport} element={<TransportBookingPage />} />
        <Route path={ROUTES.transportActiveRide} element={<ActiveRidePage />} />
        <Route path={ROUTES.trips} element={<TripsPage />} />
        {/* /bookings and /trips were the same screen; /trips is the built,
            wired one ("My Bookings"). The list route redirects rather than
            404ing so existing links and bookmarks still land somewhere real.
            The detail route below is a different screen and stays. */}
        <Route path={ROUTES.bookings} element={<Navigate to={ROUTES.trips} replace />} />
        <Route path={`${ROUTES.bookings}/:reference`} element={<BookingDetailPage />} />
        <Route path={ROUTES.itineraries} element={<ItinerariesPage />} />
        <Route path={`${ROUTES.itineraries}/:id`} element={<ItineraryDetailPage />} />
        {/* Role-gated consoles. RoleGate is presentation only — it keeps
            someone out of a screen whose every button would 403 — the API
            enforces the role on each call regardless. */}
        <Route
          path={ROUTES.operator}
          element={
            <RoleGate allow={['OPERATOR']} title="Operator">
              <OperatorToursPage />
            </RoleGate>
          }
        />
        <Route
          path={ROUTES.admin}
          element={
            <RoleGate allow={['ADMIN']} title="Admin">
              <AdminModerationPage />
            </RoleGate>
          }
        />
        <Route
          path={ROUTES.adminDestinations}
          element={
            <RoleGate allow={['ADMIN']} title="Destinations">
              <AdminDestinationsPage />
            </RoleGate>
          }
        />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.profilePersonalInfo} element={<PersonalInfoPage />} />
        <Route path={ROUTES.profileEmergencyContacts} element={<EmergencyContactsPage />} />
        <Route path={ROUTES.paymentCallback} element={<PaymentCallbackPage />} />
      </Route>

      {/* Auth screens are full-bleed two-pane layouts, so they sit OUTSIDE
          AppLayout — no top nav, bottom tab bar or footer. AuthLayout's
          Voyago wordmark links back home. */}
      <Route path={ROUTES.auth.login} element={<LoginPage />} />
      <Route path={ROUTES.auth.register} element={<RegisterPage />} />
      <Route path={ROUTES.auth.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={ROUTES.auth.resetPassword} element={<ResetPasswordPage />} />
      </Routes>
    </>
  );
}

export default App;
