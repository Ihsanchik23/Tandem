"use client";

import { useState } from "react";
import { format, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { Section } from "@/components/ui/Grouped";
import type { PagePerson, TaskEvent } from "./data";
import { TASK_STATUSES, type TaskStatus } from "./logic";
import { formatAgo, formatDateTime } from "./time";

// Сначала видны последние записи; «Показать ещё» раскрывает по 5 более ранних.
const FIRST = 3;
const STEP = 5;

// История задачи — лёгкая хронология (новые сверху): тонкая линия слева с маленькими точками,
// в строке — аватар, имя, что сделал(а) и когда. Отдельной группой в конце карточки задачи.
export function History({ events, people, now }: { events: TaskEvent[] | null; people: Map<string, PagePerson>; now: number | null }) {
  const s = t.tasks;
  const [limit, setLimit] = useState(FIRST);
  const items = (events ?? []).flatMap((e) => {
    const text = describe(e, people, now);
    return text ? [{ e, text }] : [];
  });
  const shown = items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <Section title={items.length > 0 ? `${s.history} · ${items.length}` : s.history}>
      <div className="px-3.5 py-3">
        {events === null ? (
          <p className="text-sm text-muted">{s.loading}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">{s.historyEmpty}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <ol className="flex flex-col">
              {shown.map(({ e, text }, i) => {
                const last = i === shown.length - 1;
                const name = e.actor?.name || s.someone;
                return (
                  <li key={e.id} className="relative pb-2.5 pl-5 last:pb-0">
                    {/* Линия к следующей записи и маленькая точка; самая свежая — фирменного цвета. */}
                    {!last ? <span aria-hidden className="absolute bottom-0 left-[3px] top-3 w-px bg-line" /> : null}
                    <span aria-hidden className={`absolute left-0 top-[7px] h-[7px] w-[7px] rounded-full ${i === 0 ? "bg-accent" : "bg-neutral-300"}`} />
                    <div className="flex items-start gap-2">
                      <span className="mt-px shrink-0">
                        <Avatar url={e.actor?.avatarUrl} name={name} size={18} />
                      </span>
                      <p className="min-w-0 text-[13px] leading-5 text-ink">
                        <span className="font-semibold">{name}</span> {text}
                        {now !== null ? (
                          <time dateTime={e.createdAt} title={formatDateTime(e.createdAt, now)} className="whitespace-nowrap text-[12px] text-muted">
                            {" "}
                            · {formatAgo(e.createdAt, now)}
                          </time>
                        ) : null}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {hidden > 0 ? (
              <button
                type="button"
                onClick={() => setLimit((n) => n + STEP)}
                className="self-start pl-5 text-[13px] font-medium text-accent hover:text-accent-hover"
              >
                {s.showMore} <span className="font-normal text-muted">· {format(s.hiddenCount, { n: hidden })}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
    </Section>
  );
}

// Действие одной фразой: «сменил(а) статус: Нужно сделать → В работе».
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
      // Сменились только соисполнители — в истории не показываем.
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
