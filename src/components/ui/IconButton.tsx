"use client";

import { forwardRef } from "react";

// Компактная круглая кнопка-иконка с подсказкой (тултипом) при наведении и фокусе с клавиатуры.
// label — и подсказка, и название для экранного диктора.
// tip — где показать подсказку: под кнопкой по центру или прижатой к правому краю (у края панели).
type Props = {
  label: string;
  onClick?: () => void;
  tip?: "center" | "end";
  tone?: "default" | "danger";
  disabled?: boolean;
  pressed?: boolean;
  className?: string;
  children: React.ReactNode;
} & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-expanded" | "aria-haspopup">;

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { label, onClick, tip = "center", tone = "default", disabled, pressed, className = "", children, ...aria },
  ref,
) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        disabled={disabled}
        {...aria}
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40 ${
          tone === "danger" ? "text-muted hover:bg-red-50 hover:text-red-700" : "text-muted hover:bg-surface hover:text-ink"
        } ${pressed ? "bg-surface text-ink" : ""} ${className}`}
      >
        {children}
      </button>
      <span
        role="presentation"
        className={`pointer-events-none absolute top-full z-30 mt-1.5 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity delay-0 duration-150 [@media(hover:hover)]:group-hover/tip:opacity-100 [@media(hover:hover)]:group-hover/tip:delay-300 group-has-[:focus-visible]/tip:opacity-100 ${
          tip === "end" ? "right-0" : "left-1/2 -translate-x-1/2"
        }`}
      >
        {label}
      </span>
    </span>
  );
});

// Иконки действий (24×24, контур), общие для карточек.
function Svg({ className = "h-[18px] w-[18px]", children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}
export const PencilIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);
export const TrashIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Svg>
);
export const ArchiveBoxIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <rect x="3" y="4" width="18" height="5" rx="1.5" />
    <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
  </Svg>
);
export const RestoreIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5" />
  </Svg>
);
export const DotsIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="5" cy="12" r="1.1" fill="currentColor" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    <circle cx="19" cy="12" r="1.1" fill="currentColor" />
  </Svg>
);
export const XIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);
export const LinkIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </Svg>
);
