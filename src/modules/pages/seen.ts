"use client";

// Какие страницы человек уже открывал — хранится в браузере (метка «Новая» до первого открытия).
import { useSyncExternalStore } from "react";

const KEY = "tandem.pages.seen";
const listeners = new Set<() => void>();
let cache: { raw: string | null; set: ReadonlySet<string> } = { raw: null, set: new Set() };

function read(): ReadonlySet<string> {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) {
    let ids: string[] = [];
    try {
      ids = JSON.parse(raw ?? "[]");
    } catch {
      ids = [];
    }
    cache = { raw, set: new Set(Array.isArray(ids) ? ids : []) };
  }
  return cache.set;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function markPageSeen(id: string) {
  const set = read();
  if (set.has(id)) return;
  // Храним последние 500 — этого хватит надолго.
  localStorage.setItem(KEY, JSON.stringify([...set, id].slice(-500)));
  listeners.forEach((l) => l());
}

// null — пока не знаем (на сервере): метки «Новая» появятся после загрузки в браузере, без мигания.
export function useSeenPages(): ReadonlySet<string> | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
