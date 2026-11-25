import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type Common = {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string | null;
  aside?: ReactNode; // например, счётчик символов справа от подписи
};

const fieldClass =
  "w-full rounded-xl border bg-white px-4 text-base text-ink placeholder:text-neutral-400 focus:outline-none focus:ring-1";

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
  return error
    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
    : "border-neutral-300 focus:border-accent focus:ring-accent";
}

export function TextField({
  label,
  name,
  hint,
  error,
  aside,
  trailing,
  id,
  className = "",
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement> & {
  /** Кнопка внутри поля справа (например, глазок у пароля). */
  trailing?: ReactNode;
}) {
  const inputId = id ?? `field-${name}`;
  const input = (
    <input
      id={inputId}
      name={name}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
      // 16px — чтобы iPhone не увеличивал страницу при вводе.
      className={`h-12 ${fieldClass} ${stateClass(error)} ${trailing ? "pr-12" : ""} ${className}`}
      {...rest}
    />
  );
  return (
    <Frame id={inputId} label={label} name={name} hint={hint} error={error} aside={aside}>
      {trailing ? (
        <div className="relative">
          {input}
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>
        </div>
      ) : (
        input
      )}
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
        className={`min-h-28 py-3 ${fieldClass} ${stateClass(error)} ${className}`}
        {...rest}
      />
    </Frame>
  );
}
