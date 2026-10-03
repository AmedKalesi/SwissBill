import { Component, type ErrorInfo, type ReactNode } from "react";
import { withTranslation, type WithTranslation } from "react-i18next";

/**
 * Top-level error boundary.
 *
 * React error boundaries must be class components. This one catches render
 * errors anywhere below it and shows a branded, translated fallback instead of
 * letting the whole app unmount to a blank white screen.
 *
 * It is intentionally i18n-aware via `withTranslation` so the fallback copy
 * follows the active locale, and it reports the error to the console (and to
 * `window.onerror` handlers / monitoring, if any are attached) for debugging.
 */
type ErrorBoundaryProps = WithTranslation & {
  children: ReactNode;
  /**
   * Optional custom fallback. When omitted, the built-in branded fallback is
   * rendered.
   */
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the error for local debugging and any attached monitoring.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback, t } = this.props;

    if (!error) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t("errors.boundaryTitle", "Something went wrong")}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t(
              "errors.boundaryDescription",
              "An unexpected error occurred while rendering this page. You can try again or reload the app.",
            )}
          </p>

          {import.meta.env.DEV && error.message ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {error.message}
            </pre>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("errors.boundaryRetry", "Try again")}
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              {t("errors.boundaryReload", "Reload app")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);
