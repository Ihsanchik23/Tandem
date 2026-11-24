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
export function WorkPanel({ data }: { data: ShellData }) {
  const collapsed = useSyncExternalStore(subscribe, () => localStorage.getItem(KEY) === "1", () => false);
  const n = t.nav;

  if (collapsed) {
    return (
      <div className="sticky top-0 hidden h-dvh shrink-0 border-r border-neutral-200 bg-white p-2 md:block">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label={n.expandPanel}
          title={n.expandPanel}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
        >
          <PanelOpenIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        aria-label={n.collapsePanel}
        title={n.collapsePanel}
        className="absolute right-3 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-neutral-100"
      >
        <PanelCloseIcon className="h-5 w-5" />
      </button>
      <CompanyPanel data={data} />
    </aside>
  );
}
