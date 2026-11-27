"use client";

import { Children } from "react";
import { t } from "@/lib/i18n";
import { IconButton, XIcon } from "./IconButton";

// Шапка и низ правых панелей — одни на все панели (docs/design.md).

/** Шапка: заголовок слева, справа — значки действий (если есть) и крестик. */
export function PanelHeader({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children?: React.ReactNode }) {
  const hasActions = Children.toArray(children).length > 0;
  return (
    <header className="relative z-10 box-content flex h-14 shrink-0 items-center gap-1 px-3 pl-5 pt-[env(safe-area-inset-top)]">
      <h2 className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">{title}</h2>
      {children}
      {hasActions ? <span aria-hidden className="mx-1 h-5 w-px bg-line" /> : null}
      <IconButton label={t.ui.close} tip="end" onClick={onClose}>
        <XIcon />
      </IconButton>
    </header>
  );
}

/** Низ панели, закреплён: «Отмена» и главная кнопка справа. Без линии — панель и так белая. */
export function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-2 bg-white px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      {children}
    </footer>
  );
}
