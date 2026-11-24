"use client";

import { useEffect } from "react";
import { t } from "@/lib/i18n";

// Панель поверх холста: на телефоне — на весь экран (выезжает снизу), на компьютере — справа.
// Всегда в разметке, чтобы плавно и выезжать, и уезжать; закрытая — невидима и недоступна.
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`fixed inset-0 z-50 flex transition-[visibility] duration-300 md:justify-end ${open ? "visible" : "invisible"}`}
    >
      <button
        type="button"
        aria-label={t.canvas.close}
        onClick={onClose}
        tabIndex={-1}
        className={`hidden flex-1 bg-black/20 transition-opacity duration-300 md:block ${open ? "opacity-100" : "opacity-0"}`}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex h-full w-full flex-col bg-white transition-transform duration-300 ease-out md:w-[420px] md:shadow-xl ${
          open ? "translate-x-0 translate-y-0" : "translate-y-full md:translate-x-full md:translate-y-0"
        }`}
      >
        <header className="flex items-center gap-3 px-5 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-neutral-300 px-3 text-base text-ink hover:bg-neutral-50"
          >
            {t.canvas.close}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3">{children}</div>
      </section>
    </div>
  );
}
