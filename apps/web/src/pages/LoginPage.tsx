import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ApiRequestError } from "@/lib/api";

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.status === 401
          ? t("auth.invalidCredentials")
          : t("common.error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 dark:bg-surface-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Logo size={36} />
          <LanguageSwitcher />
        </div>

        <div className="rounded-2xl bg-white dark:bg-surface-800 p-8 shadow-xl shadow-surface-900/5 ring-1 ring-surface-200 dark:ring-surface-700">
          <h1 className="text-2xl font-semibold tracking-tight text-surface-900 dark:text-white">
            {t("auth.loginTitle")}
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {t("auth.loginSubtitle")}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label={t("auth.email")}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label={t("auth.password")}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-swiss-red">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              {t("auth.login")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-surface-500 dark:text-surface-400">
            {t("auth.noAccount")}{" "}
            <Link
              to="/register"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {t("auth.register")}
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-surface-500 dark:text-surface-400">
            <Link
              to="/qr-generator"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {t("qrGenerator.title")} →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
