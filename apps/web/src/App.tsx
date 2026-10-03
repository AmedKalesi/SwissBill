import { lazy, Suspense, type ReactNode } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { CompanyProvider } from "@/features/company/CompanyContext";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { AppLayout } from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Route-level code splitting.
 *
 * Every page is loaded on demand so the initial bundle only ships the shell
 * (router, providers, layout) plus the first route the visitor lands on. Pages
 * use named exports, so each dynamic import is mapped to its named export.
 */
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/pages/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const CustomersPage = lazy(() =>
  import("@/pages/CustomersPage").then((m) => ({ default: m.CustomersPage })),
);
const InvoicesPage = lazy(() =>
  import("@/pages/InvoicesPage").then((m) => ({ default: m.InvoicesPage })),
);
const InvoiceNewPage = lazy(() =>
  import("@/pages/InvoiceNewPage").then((m) => ({ default: m.InvoiceNewPage })),
);
const InvoiceDetailPage = lazy(() =>
  import("@/pages/InvoiceDetailPage").then((m) => ({ default: m.InvoiceDetailPage })),
);
const ProjectsPage = lazy(() =>
  import("@/pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage })),
);
const CompanyPage = lazy(() =>
  import("@/pages/CompanyPage").then((m) => ({ default: m.CompanyPage })),
);
const BillingPage = lazy(() =>
  import("@/pages/BillingPage").then((m) => ({ default: m.BillingPage })),
);
const ReportsPage = lazy(() =>
  import("@/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const QrGeneratorPage = lazy(() =>
  import("@/pages/QrGeneratorPage").then((m) => ({ default: m.QrGeneratorPage })),
);
const LandingPage = lazy(() =>
  import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const RecurringPage = lazy(() =>
  import("@/pages/RecurringPage").then((m) => ({ default: m.RecurringPage })),
);
const QuotesPage = lazy(() =>
  import("@/pages/QuotesPage").then((m) => ({ default: m.QuotesPage })),
);
const ExpensesPage = lazy(() =>
  import("@/pages/ExpensesPage").then((m) => ({ default: m.ExpensesPage })),
);
const PortalPage = lazy(() =>
  import("@/pages/PortalPage").then((m) => ({ default: m.PortalPage })),
);

/** Full-screen spinner shown while a lazily-loaded route chunk is fetched. */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <Router>
              <AuthProvider>
                <CompanyProvider>
                <Suspense fallback={<RouteFallback />}>
                <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />

            <Route path="/" element={<LandingPage />} />
            <Route path="/qr-generator" element={<QrGeneratorPage />} />
            <Route path="/portal/:token" element={<PortalPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/new" element={<InvoiceNewPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/recurring" element={<RecurringPage />} />
              <Route path="/quotes" element={<QuotesPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/company" element={<CompanyPage />} />
              <Route path="/billing" element={<BillingPage />} />
            </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
                </CompanyProvider>
              </AuthProvider>
            </Router>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
