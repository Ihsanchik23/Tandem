"use client";

import { t } from "@/lib/i18n";
import type { PagePerson } from "./data";
import { EMPTY_FILTERS, hasActiveFilters, TASK_PRIORITIES, TASK_STATUSES, type TaskFilters, type TaskPriority, type TaskStatus } from "./logic";

const chip = (active: boolean) =>
  `h-9 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${active ? "bg-ink text-white" : "bg-neutral-100 text-ink hover:bg-neutral-200"}`;
const select =
  "h-9 shrink-0 rounded-full border border-neutral-300 bg-white px-3 text-sm text-ink focus:border-accent focus:outline-none";

// Фильтры общие для доски и списка: «Мои задачи», ответственный, приоритет, просроченные; в списке ещё статус.
export function Filters({
  value,
  onChange,
  people,
  withStatus,
}: {
  value: TaskFilters;
  onChange: (f: TaskFilters) => void;
  people: PagePerson[];
  withStatus: boolean;
}) {
  const s = t.tasks;
  const set = <K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={value.query}
        onChange={(e) => set("query", e.target.value)}
        placeholder={s.searchPlaceholder}
        aria-label={s.searchPlaceholder}
        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
      />
      <div role="group" aria-label={s.filters} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <button type="button" aria-pressed={value.mine} onClick={() => set("mine", !value.mine)} className={chip(value.mine)}>
          {s.filterMine}
        </button>
        <button type="button" aria-pressed={value.overdue} onClick={() => set("overdue", !value.overdue)} className={chip(value.overdue)}>
          {s.filterOverdue}
        </button>
        <select aria-label={s.filterAssignee} value={value.assignee} onChange={(e) => set("assignee", e.target.value)} className={select}>
          <option value="any">
            {s.filterAssignee}: {s.filterAssigneeAny.toLowerCase()}
          </option>
          <option value="none">{s.filterAssigneeNone}</option>
          {people.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label={s.filterPriority}
          value={value.priority}
          onChange={(e) => set("priority", e.target.value as TaskPriority | "any")}
          className={select}
        >
          <option value="any">
            {s.filterPriority}: {s.filterPriorityAny.toLowerCase()}
          </option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {s.priority[p]}
            </option>
          ))}
        </select>
        {withStatus ? (
          <select
            aria-label={s.filterStatus}
            value={value.status}
            onChange={(e) => set("status", e.target.value as TaskStatus | "any")}
            className={select}
          >
            <option value="any">
              {s.filterStatus}: {s.filterStatusAny.toLowerCase()}
            </option>
            {TASK_STATUSES.map((st) => (
              <option key={st} value={st}>
                {s.status[st]}
              </option>
            ))}
          </select>
        ) : null}
        {hasActiveFilters(value) ? (
          <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS, query: value.query })} className="h-9 shrink-0 px-2 text-sm font-medium text-accent underline underline-offset-4">
            {s.resetFilters}
          </button>
        ) : null}
      </div>
    </div>
  );
}
