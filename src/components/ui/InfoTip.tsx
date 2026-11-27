"use client";

import { useEffect, useId, useRef, useState } from "react";

// Кнопка «i» с пояснением во всплывающем окне — вместо длинных текстов в форме.
// Закрывается повторным нажатием, нажатием мимо и Escape.
export function InfoTip({ label, children, align = "left" }: { label: string; children: React.ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <span ref={box} className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className={`flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink ${open ? "bg-surface text-ink" : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-[18px] w-[18px]" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-full z-30 mt-1.5 w-64 animate-pop-in rounded-2xl bg-white p-3 text-[13px] font-normal leading-snug text-ink shadow-[0_12px_32px_-10px_rgba(30,30,30,0.3)] ${
            align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"
          }`}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
