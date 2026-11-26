"use client";

// Общие детали боковых карточек (задача, сотрудник): шапка, строки свойств, поповер выбора значения, кнопки.
import { Children, useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { IconButton, XIcon } from "@/components/ui/IconButton";

// Компактная шапка панели: слева — что это (название режима или статус), справа — действия и «Закрыть».
export function CardHeader({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children?: React.ReactNode }) {
  return (
    <header className="relative z-10 box-content flex h-14 shrink-0 items-center gap-1 border-b border-line px-3 pl-5 pt-[env(safe-area-inset-top)]">
      <div className="min-w-0 flex-1 truncate text-[13px] text-muted">{title}</div>
      {children}
      {Children.toArray(children).length > 0 ? <span aria-hidden className="mx-1 h-5 w-px bg-line" /> : null}
      <IconButton label={t.ui.close} tip="end" onClick={onClose}>
        <XIcon />
      </IconButton>
    </header>
  );
}

// Кнопки внизу панели (закреплены): основная — фирменного цвета, вторая — нейтральная.
export const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-neutral-300";
export const btnSecondary =
  "inline-flex h-11 items-center justify-center rounded-full bg-surface px-5 text-[14px] font-medium text-ink transition-colors hover:bg-neutral-200 disabled:opacity-60";

// Строка свойства: иконка + название (серым) и значение.
export function Prop({ icon, label, top = false, children }: { icon: React.ReactNode; label: string; top?: boolean; children: React.ReactNode }) {
  return (
    <>
      <dt className={`flex min-h-10 items-center gap-2.5 text-muted ${top ? "self-start" : ""}`}>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
        <span className="truncate">{label}</span>
      </dt>
      <dd className="flex min-h-10 min-w-0 items-center text-ink">{children}</dd>
    </>
  );
}


// Значение, которое выбирается по клику: кнопка-значение и поповер под ней.
// children получает close — закрыть после выбора.
export function FieldPopover({
  label,
  value,
  children,
}: {
  label: string;
  value: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    // Escape закрывает только поповер. Ловим на стадии захвата: в Safari фокус после клика
    // не переходит на кнопку, и иначе событие дошло бы до панели и закрыло её целиком.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`-ml-2 flex min-h-9 max-w-full items-center gap-1.5 rounded-lg px-2 text-left text-[14px] text-ink transition-colors hover:bg-surface ${open ? "bg-surface" : ""}`}
      >
        <span className="min-w-0 truncate">{value}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          // По ширине колонки значений — не вылезает за край панели.
          className="absolute left-[-0.5rem] right-0 top-full z-30 mt-1 min-w-52 origin-top-left animate-pop-in rounded-2xl border border-line bg-white p-2 shadow-[0_16px_40px_-12px_rgba(30,30,30,0.25)]"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
