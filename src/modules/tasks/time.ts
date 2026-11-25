"use client";

// Время для экрана задач. Сервер живёт в UTC, а телефон — в часовом поясе сотрудника,
// поэтому даты, «N назад» и просрочку показываем только в браузере (на сервере — null).
import { useSyncExternalStore } from "react";
import { format, pluralRu, t } from "@/lib/i18n";
import { agoParts } from "./logic";

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Раз в минуту обновляем «N назад» и «Просрочено».
  timer ??= setInterval(() => {
    now = Date.now();
    listeners.forEach((l) => l());
  }, 60_000);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
}

const dateTime = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dateTimeYear = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function formatDateTime(iso: string, nowMs: number): string {
  const d = new Date(iso);
  return (d.getFullYear() === new Date(nowMs).getFullYear() ? dateTime : dateTimeYear).format(d);
}

export function formatAgo(iso: string, nowMs: number): string {
  const a = t.tasks.ago;
  const p = agoParts(iso, nowMs);
  if (p.kind === "now") return a.now;
  const forms = p.kind === "minutes" ? a.minuteForms : p.kind === "hours" ? a.hourForms : a.dayForms;
  return format(a[p.kind], { n: p.n, unit: pluralRu(p.n, forms) });
}

const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });
const hourMinute = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

// Короткий дедлайн для карточки: «Сегодня, 20:00», «Завтра, 18:00», «28 нояб.», «3 янв. 2027 г.».
export function formatDueShort(iso: string, nowMs: number): string {
  const d = new Date(iso);
  const now = new Date(nowMs);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  if (days === 0) return `${t.tasks.today}, ${hourMinute.format(d)}`;
  if (days === 1) return `${t.tasks.tomorrow}, ${hourMinute.format(d)}`;
  return (d.getFullYear() === now.getFullYear() ? dayMonth : dayMonthYear).format(d);
}
