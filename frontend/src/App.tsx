import React, { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useApp } from "./context/AppContext";
import PageLoading from "./components/ui/PageLoading";
import Layout from "./components/layout/Layout";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import SingleTenantGuard from "./components/routing/SingleTenantGuard";
import SuperAdminRoute from "./components/routing/SuperAdminRoute";
import TenantUserRoute from "./components/routing/TenantUserRoute";
import OnboardingGate from "./components/routing/OnboardingGate";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SetPasswordPage = lazy(() => import("./pages/auth/SetPasswordPage"));
const ForgotPasswordPage = lazy(
  () => import("./pages/auth/ForgotPasswordPage"),
);
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage"));
const AccueilPage = lazy(() => import("./pages/dashboard/AccueilPage"));
const TenantsPage = lazy(() => import("./pages/tenants/TenantsPage"));
const TenantUsersPage = lazy(() => import("./pages/tenants/TenantUsersPage"));
const TenantClientsPage = lazy(
  () => import("./pages/tenants/TenantClientsPage"),
);
const ClientsPage = lazy(() => import("./pages/clients/ClientsPage"));
const UsersPage = lazy(() => import("./pages/users/UsersPage"));
const UserDetailPage = lazy(() => import("./pages/users/UserDetailPage"));
const KycDerPage = lazy(() => import("./pages/kyc/KycDerPage"));
const KycFccPage = lazy(() => import("./pages/kyc/KycFccPage"));
const PlatformAuditPage = lazy(() => import("./pages/audit/PlatformAuditPage"));
const TenantAuditPage = lazy(() => import("./pages/audit/TenantAuditPage"));
const MarchesPage = lazy(() => import("./pages/outils/MarchesPage"));
const SimulateursPage = lazy(() => import("./pages/outils/SimulateursPage"));
const IntegrationsPage = lazy(() => import("./pages/settings/IntegrationsPage"));
const FccPpPage = lazy(() => import("./pages/fcc/FccPpPage"));
const FccPmPage = lazy(() => import("./pages/fcc/FccPmPage"));

function PageLoader() {
  return <PageLoading fullScreen />;
}

function DashboardHome() {
  const { isSuperAdmin } = useApp();
  return isSuperAdmin ? <DashboardPage /> : <AccueilPage />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    console.log(location.pathname);

    if (location.pathname === "/") navigate("/login"); // Switches page programmatically
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          {/* <Route index element={<HomePage />} /> */}
          <Route path="login" element={<LoginPage />} />
          <Route path="set-password" element={<SetPasswordPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Public FCC forms — no auth required (filled by clients) */}
        <Route path="fcc/pp" element={<FccPpPage />} />
        <Route path="fcc/pm" element={<FccPmPage />} />

        <Route
          element={
            <ProtectedRoute>
              <SingleTenantGuard>
                <OnboardingGate>
                  <DashboardLayout />
                </OnboardingGate>
              </SingleTenantGuard>
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardHome />} />
          <Route
            path="dashboard/tenants"
            element={
              <SuperAdminRoute>
                <TenantsPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="dashboard/tenants/:tenantId/users"
            element={
              <SuperAdminRoute>
                <TenantUsersPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="dashboard/tenants/:tenantId/clients"
            element={
              <SuperAdminRoute>
                <TenantClientsPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="dashboard/clients"
            element={
              <TenantUserRoute>
                <ClientsPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/kyc/der"
            element={
              <TenantUserRoute>
                <KycDerPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/kyc/fcc"
            element={
              <TenantUserRoute>
                <KycFccPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/platform/audit"
            element={
              <SuperAdminRoute>
                <PlatformAuditPage />
              </SuperAdminRoute>
            }
          />
          <Route
            path="dashboard/audit"
            element={
              <TenantUserRoute adminOnly>
                <TenantAuditPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/users"
            element={
              <TenantUserRoute adminOnly>
                <UsersPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/users/new"
            element={
              <TenantUserRoute adminOnly>
                <UserDetailPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/users/:userId"
            element={
              <TenantUserRoute adminOnly>
                <UserDetailPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/integrations"
            element={
              <TenantUserRoute adminOnly>
                <IntegrationsPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/marches"
            element={
              <TenantUserRoute>
                <MarchesPage />
              </TenantUserRoute>
            }
          />
          <Route
            path="dashboard/simulateurs"
            element={
              <TenantUserRoute>
                <SimulateursPage />
              </TenantUserRoute>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
