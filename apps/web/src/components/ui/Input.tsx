import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = "", ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
        </label>
      )}
      <input
        {...rest}
        id={inputId}
        ref={ref}
        className={`block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-surface-900 transition duration-150 shadow-sm ring-1 ring-inset ring-surface-300 placeholder:text-surface-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-surface-100 disabled:text-surface-500 dark:bg-surface-800 dark:ring-surface-600 dark:placeholder:text-surface-500 dark:disabled:bg-surface-900 dark:disabled:text-surface-500 ${
          error ? "ring-swiss-red focus:ring-swiss-red" : ""
        } ${className}`}
      />
      {hint && !error && <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-swiss-red">{error}</p>}
    </div>
  );
});
