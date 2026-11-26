"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";

// Панель поверх экрана: на компьютере — справа, на телефоне — на весь экран.
// from="bottom" (по умолчанию): на телефоне выезжает снизу; from="right" — справа на любом экране
// (карточка задачи). Всегда в разметке, чтобы плавно и выезжать, и уезжать; закрытая — невидима и недоступна.
// header — своя шапка вместо стандартной (заголовок + «Закрыть»).
export function Sheet({
  open,
  title,
  onClose,
  from = "bottom",
  header,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  from?: "bottom" | "right";
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Открыта сразу при появлении (прямая ссылка на задачу) — всё равно выезжает:
  // первый кадр рисуем закрытой, на следующем — открываем.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(open));
    return () => cancelAnimationFrame(id);
  }, [open]);
  const visible = open && shown;

  const closed = from === "right" ? "translate-x-full" : "translate-y-full md:translate-x-full md:translate-y-0";

  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`fixed inset-0 z-50 flex transition-[visibility] duration-[350ms] md:justify-end ${open ? "visible" : "invisible"}`}
    >
      <button
        type="button"
        aria-label={t.ui.close}
        onClick={onClose}
        tabIndex={-1}
        // Затемнение — на весь экран под панелью (без резкого края, пока панель едет);
        // начинается чуть позже панели — иначе фон темнеет раньше, чем видно содержимое.
        className={`absolute inset-0 hidden bg-black/20 transition-opacity duration-300 ease-out md:block ${visible ? "opacity-100 delay-75" : "opacity-0"}`}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Быстрый старт и мягкая остановка (как шторки в iOS); туда и обратно — одинаково плавно, 350 мс.
        // В Tailwind 4 классы translate-* меняют CSS-свойство translate (не transform) — анимируем именно его.
        className={`relative ml-auto flex h-full w-full flex-col bg-white transition-[translate,opacity] duration-[350ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[translate] md:w-[440px] md:shadow-[-24px_0_60px_-20px_rgba(30,30,30,0.25)] ${
          visible ? "translate-x-0 translate-y-0 opacity-100" : `${closed} ${from === "right" ? "" : "opacity-0"}`
        }`}
      >
        {header ?? (
          <header className="flex items-center gap-3 px-5 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-neutral-300 px-3 text-base text-ink hover:bg-neutral-50"
            >
              {t.ui.close}
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3">{children}</div>
      </section>
    </div>
  );
}
