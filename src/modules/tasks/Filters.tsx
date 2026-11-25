"use client";

import { useEffect, useState } from "react";
import { format, t } from "@/lib/i18n";
import type { PagePerson } from "./data";
import {
  EMPTY_FILTERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskFilters,
  type TaskPriority,
  type TaskStatus,
} from "./logic";

const chip = (on: boolean) =>
  `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
    on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-surface"
  }`;
const select =
  "h-11 w-full rounded-2xl border border-line bg-white px-3 text-base text-ink focus:border-accent focus:outline-none md:h-10 md:text-sm";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4 shrink-0" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

// Строка фильтров: поиск, кнопка «Фильтры» (просроченные, ответственный, приоритет, в списке — статус)
// и отдельно «Мои задачи».
export function Filters({
  value,
  onChange,
  people,
  withStatus,
  overdueCount,
}: {
  value: TaskFilters;
  onChange: (f: TaskFilters) => void;
  people: PagePerson[];
  withStatus: boolean;
  overdueCount: number;
}) {
  const s = t.tasks;
  const [open, setOpen] = useState(false);
  const set = <K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) => onChange({ ...value, [k]: v });
  // Сколько фильтров включено в окне (на телефоне там же «Мои» и «Просроченные»).
  const inPanel =
    (value.overdue ? 1 : 0) + (value.assignee !== "any" ? 1 : 0) + (value.priority !== "any" ? 1 : 0) + (withStatus && value.status !== "any" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-muted focus-within:border-accent md:max-w-xs">
        <SearchIcon />
        <input
          type="search"
          value={value.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder={s.searchTasks}
          aria-label={s.searchTasks}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus:outline-none md:text-[13px]"
        />
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={s.filtersButton}
          className={`relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium md:px-3.5 ${
            open || inPanel > 0 ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-surface"
          }`}
        >
          <FilterIcon />
          <span className="hidden md:inline">{s.filtersButton}</span>
          {inPanel > 0 ? (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-ink">
              {inPanel}
            </span>
          ) : null}
        </button>

        {open ? (
          <>
            <button type="button" aria-label={s.close} tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-30 cursor-default" />
            <div
              role="dialog"
              aria-label={s.filtersButton}
              className="animate-fade-in absolute left-0 top-full z-40 mt-2 md:left-auto md:right-0 flex w-[min(20rem,calc(100vw-2.5rem))] flex-col gap-3 rounded-3xl bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
            >
              <button
                type="button"
                aria-pressed={value.overdue}
                onClick={() => set("overdue", !value.overdue)}
                className={`${chip(value.overdue)} self-start`}
              >
                {overdueCount > 0 ? format(s.overdueCount, { n: overdueCount }) : s.filterOverdue}
              </button>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{s.filterAssignee}</span>
                <select value={value.assignee} onChange={(e) => set("assignee", e.target.value)} className={select}>
                  <option value="any">{s.filterAssigneeAny}</option>
                  <option value="none">{s.filterAssigneeNone}</option>
                  {people.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{s.filterPriority}</span>
                <select value={value.priority} onChange={(e) => set("priority", e.target.value as TaskPriority | "any")} className={select}>
                  <option value="any">{s.filterPriorityAny}</option>
                  {TASK_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {s.priority[p]}
                    </option>
                  ))}
                </select>
              </label>
              {withStatus ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">{s.filterStatus}</span>
                  <select value={value.status} onChange={(e) => set("status", e.target.value as TaskStatus | "any")} className={select}>
                    <option value="any">{s.filterStatusAny}</option>
                    {TASK_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {s.status[st]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...EMPTY_FILTERS, query: value.query })}
                  className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  {s.resetFilters}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-full bg-ink px-4 text-sm font-medium text-white">
                  {s.close}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
      {/* «Мои задачи» — отдельно: самый частый фильтр. */}
      <button type="button" aria-pressed={value.mine} onClick={() => set("mine", !value.mine)} className={`${chip(value.mine)} h-10!`}>
        {s.filterMine}
      </button>
    </div>
  );
}
