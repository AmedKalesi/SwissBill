import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Company } from "@swissbill/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";

const ACTIVE_COMPANY_KEY = "flinkli.activeCompanyId";

interface CompanyContextValue {
  /** Kullanıcının tüm şirketleri */
  companies: Company[];
  /** Şu anda seçili olan aktif şirket (yoksa null) */
  activeCompany: Company | null;
  /** Aktif şirketin kimliği (yoksa null) */
  activeCompanyId: string | null;
  /** Şirket listesi yükleniyor mu */
  isLoading: boolean;
  /** Aktif şirketi değiştir */
  setActiveCompany: (companyId: string) => void;
  /** Şirket listesini yeniden çek */
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

function readStoredCompanyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_COMPANY_KEY);
  } catch {
    return null;
  }
}

function writeStoredCompanyId(companyId: string | null): void {
  try {
    if (companyId) {
      localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
    } else {
      localStorage.removeItem(ACTIVE_COMPANY_KEY);
    }
  } catch {
    // localStorage erişilemezse sessizce yoksay
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(
    readStoredCompanyId,
  );

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: () => api.get<Company[]>("/company"),
    enabled: isAuthenticated,
  });

  const companies = useMemo(
    () => companiesQuery.data ?? [],
    [companiesQuery.data],
  );

  // Aktif şirket geçersizse (silinmiş veya hiç seçilmemişse) ilk şirkete düş.
  useEffect(() => {
    if (companies.length === 0) {
      if (activeCompanyId !== null) {
        setActiveCompanyIdState(null);
        writeStoredCompanyId(null);
      }
      return;
    }

    const stillExists = companies.some((c) => c.id === activeCompanyId);
    if (!stillExists) {
      const fallback = companies[0].id;
      setActiveCompanyIdState(fallback);
      writeStoredCompanyId(fallback);
    }
  }, [companies, activeCompanyId]);

  const setActiveCompany = useCallback(
    (companyId: string) => {
      setActiveCompanyIdState(companyId);
      writeStoredCompanyId(companyId);
      // Şirkete bağlı sorguları yeniden çek
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["recurring"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    [queryClient],
  );

  const refreshCompanies = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["companies"] });
  }, [queryClient]);

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? null,
    [companies, activeCompanyId],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companies,
      activeCompany,
      activeCompanyId: activeCompany?.id ?? null,
      isLoading: companiesQuery.isLoading,
      setActiveCompany,
      refreshCompanies,
    }),
    [
      companies,
      activeCompany,
      companiesQuery.isLoading,
      setActiveCompany,
      refreshCompanies,
    ],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
