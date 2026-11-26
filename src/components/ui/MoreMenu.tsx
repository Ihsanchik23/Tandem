"use client";

import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import { DotsIcon, IconButton } from "./IconButton";

export type MoreItem = { key: string; label: string; icon?: React.ReactNode; tone?: "default" | "danger"; onSelect: () => void };

// Меню «⋯»: второстепенные действия. Закрывается по выбору, Escape и нажатию мимо.
export function MoreMenu({ items, label = t.ui.more, tip = "center", size = "md" }: { items: MoreItem[]; label?: string; tip?: "center" | "end"; size?: "sm" | "md" }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <span ref={box} className="relative inline-flex">
      <IconButton
        label={label}
        tip={tip}
        pressed={open}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={size === "sm" ? "h-8! w-8!" : ""}
      >
        <DotsIcon />
      </IconButton>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1.5 min-w-48 origin-top-right animate-pop-in rounded-2xl border border-line bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(30,30,30,0.25)]"
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[14px] transition-colors ${
                it.tone === "danger" ? "text-red-700 hover:bg-red-50" : "text-ink hover:bg-surface"
              }`}
            >
              {it.icon ? <span className={it.tone === "danger" ? "" : "text-muted"}>{it.icon}</span> : null}
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
