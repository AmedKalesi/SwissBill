import type { ReactNode } from "react";
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
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CustomersPage } from "@/pages/CustomersPage";
import { InvoicesPage } from "@/pages/InvoicesPage";
import { InvoiceNewPage } from "@/pages/InvoiceNewPage";
import { InvoiceDetailPage } from "@/pages/InvoiceDetailPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { CompanyPage } from "@/pages/CompanyPage";
import { BillingPage } from "@/pages/BillingPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { QrGeneratorPage } from "@/pages/QrGeneratorPage";
import { LandingPage } from "@/pages/LandingPage";
import { RecurringPage } from "@/pages/RecurringPage";
import { QuotesPage } from "@/pages/QuotesPage";
import { ExpensesPage } from "@/pages/ExpensesPage";
import { PortalPage } from "@/pages/PortalPage";

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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <CompanyProvider>
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
            </CompanyProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
