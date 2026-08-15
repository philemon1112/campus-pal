import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProfilePage } from '@/pages/ProfilePage';
import { PersonalInfoPage } from '@/pages/PersonalInfoPage';
import { SavedPage } from '@/pages/SavedPage';
import { ExplorePage } from '@/modules/locations/pages/ExplorePage';
import { LocationDetailPage } from '@/modules/locations/pages/LocationDetailPage';
import { FoodJointsPage } from '@/modules/food/pages/FoodJointsPage';
import { FoodJointDetailPage } from '@/modules/food/pages/FoodJointDetailPage';
import { AssistantHistoryPage } from '@/modules/assistant/pages/AssistantHistoryPage';
import { VendorConsolePage } from '@/modules/vendor/pages/VendorConsolePage';
import { AdminLocationsPage } from '@/modules/admin/pages/AdminLocationsPage';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { RegisterPage } from '@/modules/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage';
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
        {/* FR-4.1 — the core of the app is browsable WITHOUT an account.
            Explore and Food are public here, and their endpoints are public
            server-side for the same reason. This inverts the guard used by
            the app this was forked from, where everything but one screen
            required a login. */}
        <Route element={<AppLayout />}>
          {/* SRS §4.1 describes two main tabs and no home screen, so "/"
              lands on Explore rather than inventing a third destination. */}
          <Route path={ROUTES.home} element={<Navigate to={ROUTES.explore} replace />} />
          <Route path={ROUTES.explore} element={<ExplorePage />} />
          <Route path={`${ROUTES.explore}/:slug`} element={<LocationDetailPage />} />
          <Route path={ROUTES.food} element={<FoodJointsPage />} />
          <Route path={`${ROUTES.food}/:slug`} element={<FoodJointDetailPage />} />
        </Route>

        {/* Everything that is personal to one account. */}
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path={ROUTES.saved} element={<SavedPage />} />
          <Route path={ROUTES.assistantHistory} element={<AssistantHistoryPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={ROUTES.profilePersonalInfo} element={<PersonalInfoPage />} />

          {/* Role-gated consoles. RoleGate is presentation only — it keeps
              someone out of a screen whose every button would 403 — the API
              enforces the role on each call regardless. */}
          <Route
            path={ROUTES.vendor}
            element={
              <RoleGate allow={['VENDOR']} title="My food joint">
                <VendorConsolePage />
              </RoleGate>
            }
          />
          <Route
            path={ROUTES.adminLocations}
            element={
              <RoleGate allow={['ADMIN']} title="Campus locations">
                <AdminLocationsPage />
              </RoleGate>
            }
          />
        </Route>

        {/* Auth screens are full-bleed two-pane layouts, so they sit OUTSIDE
            AppLayout — no top nav, bottom tab bar or footer. */}
        <Route path={ROUTES.auth.login} element={<LoginPage />} />
        <Route path={ROUTES.auth.register} element={<RegisterPage />} />
        <Route path={ROUTES.auth.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.auth.resetPassword} element={<ResetPasswordPage />} />
      </Routes>
    </>
  );
}

export default App;
