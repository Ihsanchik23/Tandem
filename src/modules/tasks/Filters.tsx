"use client";

import { format, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { ActiveFilters, ChoiceChips, FilterMenu, FilterSection, FilterSwitch, OptionList } from "@/components/ui/filters/FilterMenu";
import type { PagePerson } from "./data";
import { EMPTY_FILTERS, TASK_PRIORITIES, TASK_STATUSES, type TaskFilters, type TaskPriority, type TaskStatus } from "./logic";

const chip = (on: boolean) =>
  `inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
    on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-surface"
  }`;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

// Строка фильтров: поиск, общий фильтр (components/ui/filters — тот же, что в каталоге)
// и отдельно «Мои задачи». Под строкой — выбранные фильтры чипсами. Всё применяется сразу.
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
  const set = <K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) => onChange({ ...value, [k]: v });
  const statusOn = withStatus && value.status !== "any";
  const count = (value.overdue ? 1 : 0) + (value.assignee !== "any" ? 1 : 0) + (value.priority !== "any" ? 1 : 0) + (statusOn ? 1 : 0);
  // «Сбросить» снимает фильтры окна; поиск и «Мои задачи» остаются.
  const reset = () => onChange({ ...EMPTY_FILTERS, query: value.query, mine: value.mine });

  const assigneeLabel =
    value.assignee === "any"
      ? s.filterAssigneeAny
      : value.assignee === "none"
        ? s.filterAssigneeNone
        : (people.find((p) => p.userId === value.assignee)?.name ?? s.formerMember);

  const active = [
    ...(value.overdue ? [{ key: "overdue", label: s.filterOverdue, onRemove: () => set("overdue", false) }] : []),
    ...(value.assignee !== "any" ? [{ key: "assignee", label: assigneeLabel, onRemove: () => set("assignee", "any") }] : []),
    ...(value.priority !== "any"
      ? [{ key: "priority", label: `${s.filterPriority}: ${s.priority[value.priority]}`, onRemove: () => set("priority", "any") }]
      : []),
    ...(statusOn && value.status !== "any" ? [{ key: "status", label: s.status[value.status], onRemove: () => set("status", "any") }] : []),
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
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

        <FilterMenu count={count} onReset={reset} compact align="left">
          <FilterSection title={s.filterOverdue}>
            <FilterSwitch
              label={s.filterOverdueOnly}
              hint={overdueCount > 0 ? format(s.overdueHint, { n: overdueCount }) : s.overdueNone}
              checked={value.overdue}
              onChange={(v) => set("overdue", v)}
            />
          </FilterSection>
          <FilterSection title={s.filterAssignee} value={assigneeLabel}>
            <OptionList
              label={s.filterAssignee}
              searchPlaceholder={s.coassigneesSearch}
              value={value.assignee}
              onChange={(v) => set("assignee", v)}
              options={[
                { value: "any", label: s.filterAssigneeAny },
                { value: "none", label: s.filterAssigneeNone },
                ...people.map((p) => ({
                  value: p.userId,
                  label: p.name,
                  sub: p.position ?? undefined,
                  leading: <Avatar url={p.avatarUrl} name={p.name} size={28} />,
                })),
              ]}
            />
          </FilterSection>
          <FilterSection title={s.filterPriority}>
            <ChoiceChips
              label={s.filterPriority}
              value={value.priority}
              onChange={(v) => set("priority", v)}
              options={[
                { value: "any" as TaskPriority | "any", label: s.filterPriorityAny },
                ...TASK_PRIORITIES.map((p) => ({ value: p as TaskPriority | "any", label: s.priority[p] })),
              ]}
            />
          </FilterSection>
          {withStatus ? (
            <FilterSection title={s.filterStatus}>
              <ChoiceChips
                label={s.filterStatus}
                value={value.status}
                onChange={(v) => set("status", v)}
                options={[
                  { value: "any" as TaskStatus | "any", label: s.filterStatusAny },
                  ...TASK_STATUSES.map((st) => ({ value: st as TaskStatus | "any", label: s.status[st] })),
                ]}
              />
            </FilterSection>
          ) : null}
        </FilterMenu>

        {/* «Мои задачи» — отдельно: самый частый фильтр. */}
        <button type="button" aria-pressed={value.mine} onClick={() => set("mine", !value.mine)} className={chip(value.mine)}>
          {s.filterMine}
        </button>
      </div>
      <ActiveFilters items={active} onResetAll={reset} />
    </div>
  );
}
