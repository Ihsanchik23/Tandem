"use client";

import { useState } from "react";
import { format, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { TextAreaField, TextField } from "@/components/ui/TextField";
import type { PagePerson } from "./data";
import { TASK_LIMITS, TASK_PRIORITIES, type TaskFieldErrors, type TaskPriority } from "./logic";

export type TaskFormValue = {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  assigneeId: string | null;
  coassignees: string[];
};

const selectClass =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

// Поля задачи. При создании себя ответственным выбрать нельзя (ТЗ, раздел 12) — в списке вас нет.
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

  return (
    <div className="flex flex-col gap-4">
      <TextField
        label={s.title}
        name="task-title"
        value={value.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder={s.titlePlaceholder}
        maxLength={TASK_LIMITS.title}
        error={err("title")}
        autoComplete="off"
      />
      <TextAreaField
        label={s.description}
        name="task-description"
        value={value.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder={s.descriptionPlaceholder}
        maxLength={TASK_LIMITS.description}
        error={err("description")}
        aside={value.description.length > TASK_LIMITS.description * 0.8 ? format(s.counter, { n: value.description.length, max: TASK_LIMITS.description }) : null}
      />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink">{s.due}</legend>
        <div className="grid grid-cols-[3fr_2fr] gap-2">
          <input
            type="date"
            aria-label={s.dueDate}
            value={value.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            aria-invalid={errors.due ? true : undefined}
            className={`${selectClass} ${errors.due ? "border-red-400" : ""}`}
          />
          <input
            type="time"
            aria-label={s.dueTime}
            value={value.dueTime}
            onChange={(e) => set("dueTime", e.target.value)}
            aria-invalid={errors.due ? true : undefined}
            className={`${selectClass} ${errors.due ? "border-red-400" : ""}`}
          />
        </div>
        {errors.due ? <p className="text-sm text-red-700">{t.errors[errors.due]}</p> : null}
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{s.filterPriority}</span>
        <select value={value.priority} onChange={(e) => set("priority", e.target.value as TaskPriority)} className={selectClass}>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {s.priority[p]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{s.assignee}</span>
        <select
          value={value.assigneeId ?? ""}
          onChange={(e) => {
            const id = e.target.value || null;
            onChange({ ...value, assigneeId: id, coassignees: value.coassignees.filter((c) => c !== id) });
          }}
          className={selectClass}
        >
          <option value="">{s.assigneeNone}</option>
          {assigneeOptions.map((p) => (
            <option key={p.userId} value={p.userId}>
              {p.name}
              {p.position ? ` · ${p.position}` : ""}
            </option>
          ))}
        </select>
        {errors.assignee ? (
          <span className="text-sm text-red-700">{t.errors[errors.assignee]}</span>
        ) : mode === "create" ? (
          <span className="text-sm text-ink">{s.assigneeSelfHint}</span>
        ) : null}
      </label>

      <CoassigneePicker
        people={people.filter((p) => p.userId !== value.assigneeId)}
        selected={value.coassignees}
        onChange={(ids) => set("coassignees", ids)}
      />
    </div>
  );
}

function CoassigneePicker({ people, selected, onChange }: { people: PagePerson[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const s = t.tasks;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = people.filter((p) => `${p.name} ${p.username} ${p.position ?? ""}`.toLowerCase().includes(q));
  const chosen = new Set(selected);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-ink">
        {s.coassignees}
        {selected.length > 0 ? ` (${selected.length})` : ""}
      </legend>
      {people.length > 6 ? (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.coassigneesSearch}
          aria-label={s.coassigneesSearch}
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
        />
      ) : null}
      <ul className="flex max-h-60 flex-col overflow-y-auto rounded-xl border border-neutral-200">
        {shown.map((p) => (
          <li key={p.userId}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={chosen.has(p.userId)}
                onChange={() => onChange(chosen.has(p.userId) ? selected.filter((x) => x !== p.userId) : [...selected, p.userId])}
                className="h-5 w-5 accent-accent"
              />
              <Avatar url={p.avatarUrl} name={p.name} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-base text-ink">{p.name}</span>
                {p.position ? <span className="block truncate text-sm text-ink">{p.position}</span> : null}
              </span>
            </label>
          </li>
        ))}
        {shown.length === 0 ? <li className="px-3 py-3 text-sm text-ink">{s.coassigneesNone}</li> : null}
      </ul>
    </fieldset>
  );
}
