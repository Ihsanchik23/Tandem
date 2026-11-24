"use client";

import { useEffect } from "react";
import { t } from "@/lib/i18n";

// Панель поверх холста: на телефоне — на весь экран, на компьютере — справа.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex md:justify-end">
      <button type="button" aria-label={t.canvas.close} onClick={onClose} className="hidden flex-1 bg-black/20 md:block" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full flex-col bg-white md:w-[420px] md:border-l md:border-neutral-200 md:shadow-xl"
      >
        <header className="flex items-center gap-3 border-b border-neutral-200 px-5 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-neutral-300 px-3 text-base text-ink hover:bg-neutral-50"
          >
            {t.canvas.close}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5">{children}</div>
      </section>
    </div>
  );
}
