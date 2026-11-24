"use client";

import { format, t } from "@/lib/i18n";
import type { PagePerson, TaskEvent } from "./data";
import { TASK_STATUSES, type TaskStatus } from "./logic";
import { formatAgo, formatDateTime } from "./time";

// Короткая история: создание, смена статуса, ответственного и дедлайна, архив.
export function History({ events, people, now }: { events: TaskEvent[] | null; people: Map<string, PagePerson>; now: number | null }) {
  const s = t.tasks;
  const lines = (events ?? []).map((e) => ({ e, text: describe(e, people, now) })).filter((x) => x.text);

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-semibold text-ink">{s.history}</h3>
      {events === null ? (
        <p className="text-sm text-ink">{s.loading}</p>
      ) : lines.length === 0 ? (
        <p className="text-sm text-ink">{s.historyEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lines.map(({ e, text }) => (
            <li key={e.id} className="text-sm text-ink">
              <span className="font-medium">{e.actor?.name || s.someone}</span> {text}
              {now !== null ? <span className="text-xs"> · {formatAgo(e.createdAt, now)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describe(e: TaskEvent, people: Map<string, PagePerson>, now: number | null): string | null {
  const ev = t.tasks.event;
  const d = e.details;
  const status = (v: unknown) => (TASK_STATUSES.includes(v as TaskStatus) ? t.tasks.status[v as TaskStatus] : "—");
  const person = (v: unknown) => (typeof v === "string" ? (people.get(v)?.name ?? t.tasks.formerMember) : t.tasks.nobody);
  const date = (v: unknown) => (typeof v === "string" && now !== null ? formatDateTime(v, now) : "—");

  switch (e.kind) {
    case "created":
      return ev.created;
    case "status_changed":
      return format(ev.status_changed, { from: status(d.from), to: status(d.to) });
    case "assignees_changed":
      // Сменились только соисполнители — в короткой истории не показываем.
      if (d.from === d.to) return null;
      return format(ev.assignees_changed, { from: person(d.from), to: person(d.to) });
    case "updated":
      return d.due_changed === true ? format(ev.due_changed, { from: date(d.from_due), to: date(d.to_due) }) : ev.updated;
    case "archived":
      return ev.archived;
    case "restored":
      return ev.restored;
    default:
      return null;
  }
}
