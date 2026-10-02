import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { ApiRequestError } from "@/lib/api";

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/company", { replace: true });
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setError("Diese E-Mail ist bereits registriert.");
      } else {
        setError(t("common.error"));
      }
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
            {t("auth.registerTitle")}
          </h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            {t("auth.registerSubtitle")}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label={t("auth.name")}
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
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
              autoComplete="new-password"
              required
              minLength={8}
              hint="Mindestens 8 Zeichen"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-swiss-red">
                {error}
              </p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              {t("auth.register")}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-surface-500 dark:text-surface-400">
            {t("auth.hasAccount")}{" "}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              {t("auth.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
