"use client";

import { useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { CompanyPanel } from "./CompanyPanel";
import { PanelCloseIcon, PanelOpenIcon } from "./icons";

// Свёрнута ли панель — запоминаем в браузере.
const KEY = "tandem.workPanel.collapsed";
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function setCollapsed(v: boolean) {
  localStorage.setItem(KEY, v ? "1" : "0");
  listeners.forEach((l) => l());
}

// Постоянная панель «Работа» на компьютере: компания, рабочие страницы, «Моя компания».
// Сворачивается и разворачивается плавно (ширина и прозрачность).
export function WorkPanel({ data }: { data: ShellData }) {
  const collapsed = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY) === "1", () => false);
  const n = t.nav;
  const btn = "absolute z-10 flex items-center justify-center rounded-xl text-muted transition-opacity duration-200 hover:bg-neutral-100 hover:text-ink";

  return (
    <aside
      className={`sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r-[0.5px] border-line bg-white transition-[width] duration-300 ease-out md:block ${
        collapsed ? "w-[72px]" : "w-72"
      }`}
    >
      <div
        inert={collapsed}
        aria-hidden={collapsed}
        className={`absolute inset-y-0 left-0 w-72 transition-opacity duration-200 ${collapsed ? "opacity-0" : "opacity-100"}`}
      >
        <CompanyPanel data={data} />
      </div>
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        disabled={collapsed}
        aria-label={n.collapsePanel}
        title={n.collapsePanel}
        className={`${btn} right-5 top-[26px] h-9 w-9 ${collapsed ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <PanelCloseIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        disabled={!collapsed}
        aria-label={n.expandPanel}
        title={n.expandPanel}
        className={`${btn} left-3.5 top-5 h-11 w-11 ${collapsed ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <PanelOpenIcon className="h-5 w-5" />
      </button>
    </aside>
  );
}
