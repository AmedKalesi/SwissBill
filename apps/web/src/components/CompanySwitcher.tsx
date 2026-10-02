import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCompany } from "@/features/company/CompanyContext";

/**
 * Aktif şirketi değiştirmek için açılır menü.
 * Birden fazla şirket yoksa kompakt bir etiket gösterir.
 */
export function CompanySwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { companies, activeCompany, setActiveCompany, isLoading } = useCompany();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (isLoading) {
    return (
      <div className="h-9 w-40 animate-pulse rounded-lg bg-surface-100 dark:bg-surface-700" />
    );
  }

  // Hiç şirket yoksa: şirket oluşturmaya yönlendir
  if (companies.length === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate("/company")}
        className="flex items-center gap-2 rounded-lg border border-dashed border-surface-300 px-3 py-2 text-sm font-medium text-surface-600 hover:border-brand-400 hover:text-brand-700 dark:border-surface-600 dark:text-surface-300 dark:hover:text-brand-300"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t("companySwitcher.create")}
      </button>
    );
  }

  // Tek şirket varsa: sadece etiket
  if (companies.length === 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-surface-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M4 21h16M9 7h2M9 11h2M9 15h2" />
        </svg>
        <span className="max-w-[10rem] truncate">{activeCompany?.name}</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm font-medium text-surface-700 hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:hover:text-brand-300"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-surface-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16M4 21h16M9 7h2M9 11h2M9 15h2" />
        </svg>
        <span className="max-w-[10rem] truncate">{activeCompany?.name}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-surface-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-700 dark:bg-surface-800"
        >
          <li className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
            {t("companySwitcher.label")}
          </li>
          {companies.map((company) => {
            const isActive = company.id === activeCompany?.id;
            return (
              <li key={company.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveCompany(company.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                    isActive
                      ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                      : "text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-700"
                  }`}
                >
                  <span className="truncate">{company.name}</span>
                  {isActive && (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
          <li className="mt-1 border-t border-surface-100 dark:border-surface-700">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/company");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/60"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t("companySwitcher.manage")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
