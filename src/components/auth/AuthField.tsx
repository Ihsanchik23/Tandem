"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { t } from "@/lib/i18n";
import { EyeIcon, EyeOffIcon } from "@/components/nav/icons";

// Поле и кнопки форм входа (вид — как в старом проекте eZone, цвета — токены Tandem; стили auth-* в globals.css).
// Подпись поля видна только экранному диктору, на экране — подсказка внутри поля (placeholder).

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  name: string;
  /** Текст внутри поля; он же — подпись для экранного диктора. */
  label: string;
  hint?: ReactNode;
  /** Поле пароля с кнопкой-глазком «показать / скрыть». */
  password?: boolean;
};

export function AuthField({ name, label, hint, password = false, id, type, ...rest }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          placeholder={label}
          aria-describedby={hintId}
          type={password ? (visible ? "text" : "password") : type}
          className={`auth-input ${password ? "auth-input-password" : ""}`}
          {...(password ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false } : {})}
          {...rest}
        />
        {password ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
            aria-pressed={visible}
            aria-controls={inputId}
            className="auth-password-toggle"
          >
            {visible ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="auth-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type SubmitProps = ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; pendingText?: string };

// Главная кнопка формы (variant="primary") или светлая с обводкой (variant="secondary").
export function AuthButton({
  pending = false,
  pendingText,
  children,
  disabled,
  className = "",
  variant = "primary",
  ...rest
}: SubmitProps & { variant?: "primary" | "secondary" }) {
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${variant === "primary" ? "auth-submit" : "auth-secondary"} ${className}`}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
