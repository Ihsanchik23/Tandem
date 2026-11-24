"use client";

import { useSyncExternalStore } from "react";
import { t } from "@/lib/i18n";
import type { ShellData } from "@/lib/nav/shell";
import { CompanyPanel } from "./CompanyPanel";

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
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16M13 10l2 2-2 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        aria-label={n.collapsePanel}
        title={n.collapsePanel}
        className="absolute right-2 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-ink hover:bg-neutral-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M15 10l-2 2 2 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <CompanyPanel data={data} />
    </aside>
  );
}
