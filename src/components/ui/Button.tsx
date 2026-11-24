import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  pending?: boolean;
  pendingText?: string;
};

export function Button({
  variant = "primary",
  pending = false,
  pendingText,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const base =
    "inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-hover"
      : "border border-neutral-300 bg-white text-ink hover:bg-neutral-50";
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${base} ${styles} ${className}`}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
