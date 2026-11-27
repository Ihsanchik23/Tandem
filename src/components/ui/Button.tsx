import type { ButtonHTMLAttributes } from "react";

// Главная кнопка одна на всё приложение: сплошной фирменный цвет #D4442A, при наведении — #BA3A23.
// Все кнопки — таблетки без рамок, разделение только заливкой.
// Правила — docs/design.md. Вторая кнопка рядом с главной — нейтральная (SecondaryButton).
const PRIMARY_FILL =
  "bg-accent text-white hover:bg-accent-hover active:bg-accent-hover disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-white aria-busy:bg-accent! aria-busy:opacity-75";
const SECONDARY_FILL = "bg-surface text-ink hover:bg-line disabled:cursor-not-allowed disabled:opacity-60";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Размеры: md — в панелях и формах (по умолчанию), sm — внутри групп (подтверждения), xs — в строке (комментарий). */
const SIZE = {
  xs: "h-8 px-3.5 text-[13px]",
  sm: "h-10 px-4 text-[14px]",
  md: "h-11 px-6 text-[15px]",
} as const;

export const primaryButton = (size: keyof typeof SIZE = "md") =>
  `inline-flex shrink-0 items-center justify-center rounded-full font-semibold transition-colors ${SIZE[size]} ${PRIMARY_FILL} ${FOCUS}`;
export const secondaryButton = (size: keyof typeof SIZE = "md") =>
  `inline-flex shrink-0 items-center justify-center rounded-full font-medium transition-colors ${SIZE[size]} ${SECONDARY_FILL} ${FOCUS}`;
/** Подтверждение опасного действия (удалить, в архив) — красная заливка той же формы. */
export const dangerButton = (size: keyof typeof SIZE = "md") =>
  `inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white transition-colors bg-red-700 hover:bg-red-800 disabled:opacity-60 ${SIZE[size]} ${FOCUS}`;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingText?: string;
  size?: keyof typeof SIZE;
};

export function PrimaryButton({ pending = false, pendingText, size = "md", className = "", children, disabled, type = "button", ...rest }: Props) {
  return (
    <button {...rest} type={type} disabled={disabled || pending} aria-busy={pending || undefined} className={`${primaryButton(size)} ${className}`}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function SecondaryButton({ size = "md", className = "", type = "button", ...rest }: Omit<Props, "pending" | "pendingText">) {
  return <button {...rest} type={type} className={`${secondaryButton(size)} ${className}`} />;
}

/** Широкая кнопка (h-12) — и для ссылок-кнопок на отдельных страницах. */
export const wideButton = (variant: "primary" | "secondary" = "primary") =>
  `inline-flex h-12 items-center justify-center rounded-full px-4 text-base font-medium transition-colors ${variant === "primary" ? PRIMARY_FILL : SECONDARY_FILL} ${FOCUS}`;

// Широкая кнопка на всю ширину (входы, формы на отдельной странице). Заливка — та же, что у PrimaryButton и SecondaryButton.
export function Button({
  variant = "primary",
  pending = false,
  pendingText,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; pending?: boolean; pendingText?: string }) {
  return (
    <button {...rest} disabled={disabled || pending} aria-busy={pending || undefined} className={`${wideButton(variant)} w-full ${className}`}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
