"use client";

import { useState } from "react";
import { format, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { CalendarIcon, PersonChip, PriorityBadge } from "./bits";
import type { PagePerson } from "./data";
import { TASK_LIMITS, TASK_PRIORITIES, type TaskFieldErrors, type TaskPriority } from "./logic";
import { FieldPopover, FlagIcon, Prop, TextIcon, UserIcon, UsersIcon } from "./parts";

export type TaskFormValue = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  assigneeId: string | null;
  coassignees: string[];
};

// Дата и время — мягкие «пилюли» без рамки; календарь и часы открываются по клику (системные).
const pill =
  "h-9 min-w-0 rounded-lg border-0 bg-surface px-2 text-[14px] text-ink transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/30";

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[12px] text-red-700">{children}</p>;
}

function CheckMark({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={`ml-auto h-4 w-4 shrink-0 text-accent ${on ? "" : "opacity-0"}`} aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function Search({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const s = t.tasks;
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={s.coassigneesSearch}
      aria-label={s.coassigneesSearch}
      autoFocus
      className="mb-1 h-9 w-full rounded-lg bg-surface px-3 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 md:text-[13px]"
    />
  );
}

const rowClass = (on: boolean) =>
  `flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[14px] text-ink transition-colors ${on ? "bg-accent/[0.08] font-medium" : "hover:bg-surface"}`;

const match = (p: PagePerson, q: string) => `${p.name} ${p.username} ${p.position ?? ""}`.toLowerCase().includes(q);

// Поля задачи — той же сеткой, что карточка просмотра. Логика и проверки прежние.
// При создании себя ответственным выбрать нельзя (ТЗ, раздел 12) — в списке вас нет.
export function TaskForm({
  value,
  onChange,
  people,
  me,
  mode,
  errors,
}: {
  value: TaskFormValue;
  onChange: (v: TaskFormValue) => void;
  people: PagePerson[];
  me: string;
  mode: "create" | "edit";
  errors: TaskFieldErrors;
}) {
  const s = t.tasks;
  const set = <K extends keyof TaskFormValue>(k: K, v: TaskFormValue[K]) => onChange({ ...value, [k]: v });
  const assigneeOptions = mode === "create" ? people.filter((p) => p.userId !== me) : people;
  const err = (k: keyof TaskFieldErrors) => (errors[k] ? t.errors[errors[k]!] : null);
  const assignee = value.assigneeId ? people.find((p) => p.userId === value.assigneeId) : undefined;
  const coPeople = people.filter((p) => p.userId !== value.assigneeId);

  return (
    <div className="flex flex-col gap-6">
      {/* Заголовок — крупное поле без рамки, как заголовок в просмотре. */}
      <div>
        <textarea
          name="task-title"
          value={value.title}
          onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
          placeholder={s.titlePlaceholder}
          aria-label={s.title}
          maxLength={TASK_LIMITS.title}
          rows={1}
          autoComplete="off"
          aria-invalid={errors.title ? true : undefined}
          className="block w-full resize-none bg-transparent text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink [field-sizing:content] placeholder:text-neutral-300 focus:outline-none"
        />
        {err("title") ? <FieldError>{err("title")}</FieldError> : null}
      </div>

      <dl className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-[14px]">
        <Prop icon={<CalendarIcon className="h-[17px] w-[17px]" />} label={s.due} top={Boolean(errors.due)}>
          <div className="flex min-w-0 flex-col py-1">
            <div className="flex flex-wrap gap-1.5">
              <input
                type="date"
                aria-label={s.dueDate}
                value={value.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                aria-invalid={errors.due ? true : undefined}
                className={`${pill} min-w-[8.75rem] flex-1 ${errors.due ? "ring-2 ring-red-300" : ""}`}
              />
              <input
                type="time"
                aria-label={s.dueTime}
                value={value.dueTime}
                onChange={(e) => set("dueTime", e.target.value)}
                aria-invalid={errors.due ? true : undefined}
                className={`${pill} w-[6.25rem] flex-none ${errors.due ? "ring-2 ring-red-300" : ""}`}
              />
            </div>
            {errors.due ? <FieldError>{t.errors[errors.due]}</FieldError> : null}
          </div>
        </Prop>

        <Prop icon={<FlagIcon />} label={s.filterPriority}>
          <FieldPopover label={s.filterPriority} value={<PriorityBadge priority={value.priority} />}>
            {(close) => (
              <div role="listbox" aria-label={s.filterPriority} className="flex flex-col gap-0.5">
                {TASK_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="option"
                    aria-selected={value.priority === p}
                    onClick={() => {
                      set("priority", p);
                      close();
                    }}
                    className={rowClass(value.priority === p)}
                  >
                    <PriorityBadge priority={p} />
                    <CheckMark on={value.priority === p} />
                  </button>
                ))}
              </div>
            )}
          </FieldPopover>
        </Prop>

        <Prop icon={<UserIcon />} label={s.assignee} top={Boolean(errors.assignee) || mode === "create"}>
          <div className="flex min-w-0 flex-1 flex-col py-0.5">
            <FieldPopover
              label={s.assignee}
              value={assignee ? <PersonChip person={assignee} size={22} /> : <span className="text-muted">{s.assigneeNone}</span>}
            >
              {(close) => (
                <AssigneeList
                  people={assigneeOptions}
                  selected={value.assigneeId}
                  onPick={(id) => {
                    onChange({ ...value, assigneeId: id, coassignees: value.coassignees.filter((c) => c !== id) });
                    close();
                  }}
                />
              )}
            </FieldPopover>
            {errors.assignee ? (
              <FieldError>{t.errors[errors.assignee]}</FieldError>
            ) : mode === "create" ? (
              <p className="mt-0.5 text-[12px] text-muted">{s.assigneeSelfHint}</p>
            ) : null}
          </div>
        </Prop>

        <Prop icon={<UsersIcon />} label={s.coassignees}>
          <FieldPopover
            label={s.coassignees}
            value={
              value.coassignees.length === 0 ? (
                <span className="text-muted">{s.coassigneesAdd}</span>
              ) : (
                <CoassigneeSummary ids={value.coassignees} people={people} />
              )
            }
          >
            {() => <CoassigneeList people={coPeople} selected={value.coassignees} onChange={(ids) => set("coassignees", ids)} />}
          </FieldPopover>
        </Prop>
      </dl>

      {/* Описание — в мягкой плашке, как в просмотре. */}
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted">
          <TextIcon />
          {s.description}
          {value.description.length > TASK_LIMITS.description * 0.8 ? (
            <span className="ml-auto text-[12px] font-normal tabular-nums">
              {format(s.counter, { n: value.description.length, max: TASK_LIMITS.description })}
            </span>
          ) : null}
        </h3>
        <textarea
          name="task-description"
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={s.descriptionPlaceholder}
          aria-label={s.description}
          maxLength={TASK_LIMITS.description}
          aria-invalid={errors.description ? true : undefined}
          className={`block min-h-28 w-full resize-none rounded-2xl bg-surface px-4 py-3.5 text-base leading-relaxed text-ink [field-sizing:content] placeholder:text-muted focus:outline-none focus:ring-2 md:text-[15px] ${
            errors.description ? "ring-2 ring-red-300 focus:ring-red-300" : "focus:ring-accent/30"
          }`}
        />
        {err("description") ? <FieldError>{err("description")}</FieldError> : null}
      </section>
    </div>
  );
}

function AssigneeList({ people, selected, onPick }: { people: PagePerson[]; selected: string | null; onPick: (id: string | null) => void }) {
  const s = t.tasks;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = people.filter((p) => match(p, q));
  return (
    <div className="flex flex-col">
      {people.length > 6 ? <Search value={query} onChange={setQuery} /> : null}
      <div role="listbox" aria-label={s.assignee} className="flex max-h-64 flex-col gap-0.5 overflow-y-auto overscroll-contain">
        {!q ? (
          <button type="button" role="option" aria-selected={selected === null} onClick={() => onPick(null)} className={rowClass(selected === null)}>
            <span className="inline-block h-6 w-6 shrink-0 rounded-full border-[1.5px] border-dashed border-neutral-400" aria-hidden />
            <span className="text-muted">{s.assigneeNone}</span>
            <CheckMark on={selected === null} />
          </button>
        ) : null}
        {shown.map((p) => (
          <button key={p.userId} type="button" role="option" aria-selected={selected === p.userId} onClick={() => onPick(p.userId)} className={rowClass(selected === p.userId)}>
            <Avatar url={p.avatarUrl} name={p.name} size={24} />
            <span className="min-w-0">
              <span className="block truncate">{p.name}</span>
              {p.position ? <span className="block truncate text-[12px] font-normal text-muted">{p.position}</span> : null}
            </span>
            <CheckMark on={selected === p.userId} />
          </button>
        ))}
        {shown.length === 0 ? <p className="px-2.5 py-2 text-[13px] text-muted">{t.ui.filters.nothingFound}</p> : null}
      </div>
    </div>
  );
}

function CoassigneeSummary({ ids, people }: { ids: string[]; people: PagePerson[] }) {
  const s = t.tasks;
  const known = ids.flatMap((id) => {
    const p = people.find((x) => x.userId === id);
    return p ? [p] : [];
  });
  const first = known[0];
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="flex shrink-0">
        {known.slice(0, 3).map((p, i) => (
          <span key={p.userId} className="rounded-full ring-2 ring-white" style={{ marginLeft: i === 0 ? 0 : -6 }}>
            <Avatar url={p.avatarUrl} name={p.name} size={22} />
          </span>
        ))}
      </span>
      <span className="truncate">
        {first ? first.name : s.formerMember}
        {ids.length > 1 ? <span className="text-muted"> {format(s.peopleMore, { n: ids.length - 1 })}</span> : null}
      </span>
    </span>
  );
}

function CoassigneeList({ people, selected, onChange }: { people: PagePerson[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const s = t.tasks;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = people.filter((p) => match(p, q));
  const chosen = new Set(selected);
  return (
    <div className="flex flex-col">
      {people.length > 6 ? <Search value={query} onChange={setQuery} /> : null}
      <div role="listbox" aria-multiselectable aria-label={s.coassignees} className="flex max-h-64 flex-col gap-0.5 overflow-y-auto overscroll-contain">
        {shown.map((p) => {
          const on = chosen.has(p.userId);
          return (
            <button
              key={p.userId}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => onChange(on ? selected.filter((x) => x !== p.userId) : [...selected, p.userId])}
              className={rowClass(on)}
            >
              <Avatar url={p.avatarUrl} name={p.name} size={24} />
              <span className="min-w-0">
                <span className="block truncate">{p.name}</span>
                {p.position ? <span className="block truncate text-[12px] font-normal text-muted">{p.position}</span> : null}
              </span>
              <CheckMark on={on} />
            </button>
          );
        })}
        {shown.length === 0 ? <p className="px-2.5 py-2 text-[13px] text-muted">{t.ui.filters.nothingFound}</p> : null}
      </div>
    </div>
  );
}
