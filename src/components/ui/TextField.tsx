import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Common = {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string | null;
  aside?: ReactNode; // например, счётчик символов справа от подписи
};

// Поле — таблетка без рамки на заливке bg-surface (docs/design.md). Фокус — мягкое кольцо, ошибка — красное.
const fieldClass =
  "w-full border-0 bg-surface px-5 text-base text-ink placeholder:text-muted transition-shadow focus:outline-none focus:ring-2";

function Frame({ id, label, hint, error, aside, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {aside ? <span className="text-sm text-ink">{aside}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function stateClass(error?: string | null) {
  return error ? "ring-2 ring-red-400 focus:ring-red-500" : "focus:ring-ink/15";
}

export function TextField({
  label,
  name,
  hint,
  error,
  aside,
  id,
  className = "",
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? `field-${name}`;
  return (
    <Frame id={inputId} label={label} name={name} hint={hint} error={error} aside={aside}>
      <input
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        // 16px — чтобы iPhone не увеличивал страницу при вводе.
        className={`h-12 rounded-full ${fieldClass} ${stateClass(error)} ${className}`}
        {...rest}
      />
    </Frame>
  );
}

export function TextAreaField({
  label,
  name,
  hint,
  error,
  aside,
  id,
  className = "",
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = id ?? `field-${name}`;
  return (
    <Frame id={inputId} label={label} name={name} hint={hint} error={error} aside={aside}>
      <textarea
        id={inputId}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`min-h-28 rounded-[20px] py-3 ${fieldClass} ${stateClass(error)} ${className}`}
        {...rest}
      />
    </Frame>
  );
}
