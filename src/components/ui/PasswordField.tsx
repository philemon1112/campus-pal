import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function PasswordField({ label, id, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="mb-4">
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? 'text' : 'password'}
          className="w-full rounded-xl bg-neutral-100 px-4 py-3 pr-11 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </div>
  );
}
