import type { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, id, ...inputProps }: TextFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mb-4">
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
      >
        {label}
      </label>
      <input
        id={fieldId}
        className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
        {...inputProps}
      />
    </div>
  );
}
