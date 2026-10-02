import { forwardRef, type SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, placeholder, id, className = "", ...rest },
  ref,
) {
  const selectId = id ?? rest.name;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
        </label>
      )}
      <select
        {...rest}
        id={selectId}
        ref={ref}
        className={`block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-surface-900 transition duration-150 shadow-sm ring-1 ring-inset ring-surface-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 disabled:bg-surface-50 dark:bg-surface-800 dark:ring-surface-600 dark:disabled:bg-surface-900 ${
          error ? "ring-swiss-red focus:ring-swiss-red" : ""
        } ${className}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-swiss-red">{error}</p>}
    </div>
  );
});
