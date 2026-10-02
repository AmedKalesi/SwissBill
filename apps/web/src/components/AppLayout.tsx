import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/AuthContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { Logo, LogoMark } from "@/components/Logo";

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  {
    to: "/invoices",
    labelKey: "nav.invoices",
    icon: "M7 3h10a2 2 0 012 2v14l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 012-2z",
  },
  {
    to: "/customers",
    labelKey: "nav.customers",
    icon: "M16 14a4 4 0 10-8 0M12 7a3 3 0 100 6 3 3 0 000-6z",
  },
  {
    to: "/recurring",
    labelKey: "nav.recurring",
    icon: "M4 4v5h5M20 20v-5h-5M20 9A8 8 0 006 5.3L4 7m16 10l-2 1.7A8 8 0 014 15",
  },
  {
    to: "/quotes",
    labelKey: "nav.quotes",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z",
  },
  {
    to: "/expenses",
    labelKey: "nav.expenses",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 9v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    to: "/projects",
    labelKey: "nav.projects",
    icon: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z",
  },
  {
    to: "/reports",
    labelKey: "nav.reports",
    icon: "M4 19V5m0 14h16M8 16V9m4 7V5m4 11v-4",
  },
  {
    to: "/company",
    labelKey: "nav.company",
    icon: "M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M4 21h16M9 7h2M9 11h2M9 15h2",
  },
  {
    to: "/billing",
    labelKey: "nav.billing",
    icon: "M3 10h18M7 15h2m-6 4h18V5H3v14z",
  },
];

export function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentPage = NAV_ITEMS.find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell flex min-h-screen bg-surface-50 dark:bg-surface-900">
      <aside className="hidden sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-800 lg:flex">
        <div className="flex h-20 items-center px-6">
          <Logo size={32} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-900"
                    : "text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-white"
                }`
              }
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.icon} />
              </svg>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-surface-200 p-3 dark:border-surface-700">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium text-surface-900 dark:text-surface-100">
              {user?.name}
            </p>
            <p className="truncate text-xs text-surface-500 dark:text-surface-400">
              {user?.email}
            </p>
          </div>
          <div className="mb-2">
            <LanguageSwitcher />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-white"
          >
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-surface-200 bg-white/95 px-4 backdrop-blur dark:border-surface-800 dark:bg-surface-900/95 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={t("nav.menu")} aria-expanded={menuOpen} aria-controls="mobile-navigation" className="rounded-xl border border-surface-200 p-2.5 text-surface-700 dark:border-surface-700 lg:hidden">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
            <div className="lg:hidden"><LogoMark size={28} /></div>
            <span className="hidden text-sm text-surface-400 sm:block dark:text-surface-500">flinkli <span className="mx-3">/</span></span>
            <span className="truncate text-sm font-semibold text-surface-800 dark:text-surface-100">{t(currentPage?.labelKey ?? "nav.dashboard")}</span>
          </div>
          <div className="flex items-center gap-3">
            <CompanySwitcher />
            <ThemeToggle />
            <LanguageSwitcher />
            <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-surface-100 text-sm font-semibold text-surface-700 sm:flex dark:bg-surface-700" aria-label={user?.name ?? undefined}>{user?.name?.trim().slice(0, 1).toUpperCase() || "S"}</span>
          </div>
        </header>
        {menuOpen && (
          <nav id="mobile-navigation" aria-label={t("nav.menu")} className="sticky top-20 z-20 max-h-[calc(100dvh-5rem)] overflow-y-auto border-b border-surface-200 bg-white p-4 shadow-lg dark:border-surface-800 dark:bg-surface-800 lg:hidden">
            <div className="mb-3">
              <CompanySwitcher />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `rounded-xl px-3 py-3 text-sm font-medium ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300" : "text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"}`}>{t(item.labelKey)}</NavLink>)}
            </div>
            <button type="button" onClick={handleLogout} className="mt-3 w-full border-t border-surface-200 px-3 pt-4 text-left text-sm font-medium text-surface-600 dark:border-surface-700">{t("nav.logout")}</button>
          </nav>
        )}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
