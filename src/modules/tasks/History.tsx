"use client";

import { useState } from "react";
import { format, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import { STATUS_DOT } from "./bits";
import type { PagePerson, TaskEvent } from "./data";
import { TASK_STATUSES, type TaskStatus } from "./logic";
import { formatDateTime } from "./time";

// Сначала видны последние записи; «Показать ещё» раскрывает по 5 более ранних.
const FIRST = 3;
const STEP = 5;

type Kind = "created" | "status" | "assignee" | "due" | "updated" | "archived" | "restored";
type Change = { from: React.ReactNode; to: React.ReactNode } | null;

// История задачи — вертикальная хронология сверху вниз (новые сверху): точка и линия слева,
// над карточкой — дата и время, в карточке — что произошло, кто и что было → стало.
export function History({ events, people, now }: { events: TaskEvent[] | null; people: Map<string, PagePerson>; now: number | null }) {
  const s = t.tasks;
  const [limit, setLimit] = useState(FIRST);
  const items = (events ?? []).flatMap((e) => {
    const d = describe(e, people, now);
    return d ? [{ e, ...d }] : [];
  });
  const shown = items.slice(0, limit);
  const hidden = items.length - shown.length;

  return (
    <section className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        {s.history}
        {items.length > 0 ? <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium tabular-nums text-muted">{items.length}</span> : null}
      </h3>
      {events === null ? (
        <p className="text-sm text-muted">{s.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{s.historyEmpty}</p>
      ) : (
        <>
          <ol className="relative flex flex-col gap-4">
            {shown.map(({ e, kind, change }, i) => {
              const last = i === shown.length - 1 && hidden === 0;
              const name = e.actor?.name || s.someone;
              return (
                <li key={e.id} className="relative pl-7">
                  {/* Линия к следующей записи — пунктиром, как на шкале. */}
                  {!last ? <span aria-hidden className="absolute bottom-[-1rem] left-[7px] top-5 border-l-[1.5px] border-dashed border-line" /> : null}
                  {/* Точка: кольцо; у самой свежей записи — фирменного цвета. */}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-[3px] flex h-[15px] w-[15px] items-center justify-center rounded-full border-[1.5px] bg-white ${i === 0 ? "border-accent" : "border-neutral-300"}`}
                  >
                    <span className={`h-[7px] w-[7px] rounded-full ${i === 0 ? "bg-accent" : "bg-neutral-300"}`} />
                  </span>

                  <p className="text-[12px] leading-5 text-muted tabular-nums">{now !== null ? formatDateTime(e.createdAt, now) : ""}</p>

                  <div className="mt-1.5 rounded-2xl border border-line bg-white px-4 py-3">
                    <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${i === 0 ? "bg-accent/10 text-accent" : "bg-surface text-muted"}`}>
                        <KindIcon kind={kind} />
                      </span>
                      {s.eventTitle[kind]}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px] [&>:first-child]:col-span-2">
                      <Field icon={<WhoIcon />} label={s.historyWho}>
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Avatar url={e.actor?.avatarUrl} name={name} size={20} />
                          <span className="truncate">{name}</span>
                        </span>
                      </Field>
                      {change ? (
                        <>
                          <Field icon={<FromIcon />} label={s.historyFrom}>
                            <span className="text-muted line-through decoration-neutral-300">{change.from}</span>
                          </Field>
                          <Field icon={<ToIcon />} label={s.historyTo}>
                            {change.to}
                          </Field>
                        </>
                      ) : null}
                    </dl>
                  </div>
                </li>
              );
            })}
          </ol>
          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setLimit((n) => n + STEP)}
              className="self-start pl-7 text-[13px] font-medium text-accent hover:text-accent-hover"
            >
              {s.showMore} <span className="font-normal text-muted">· {format(s.hiddenCount, { n: hidden })}</span>
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="flex items-center gap-1 text-[11px] text-muted">
        {icon}
        {label}
      </dt>
      <dd className="min-w-0 truncate font-medium text-ink">{children}</dd>
    </div>
  );
}

function StatusValue({ v }: { v: unknown }) {
  if (!TASK_STATUSES.includes(v as TaskStatus)) return <>—</>;
  const st = v as TaskStatus;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[st] }} aria-hidden />
      {t.tasks.status[st]}
    </span>
  );
}

function describe(e: TaskEvent, people: Map<string, PagePerson>, now: number | null): { kind: Kind; change: Change } | null {
  const d = e.details;
  const person = (v: unknown) => (typeof v === "string" ? (people.get(v)?.name ?? t.tasks.formerMember) : t.tasks.nobody);
  const date = (v: unknown) => (typeof v === "string" && now !== null ? formatDateTime(v, now) : "—");

  switch (e.kind) {
    case "created":
      return { kind: "created", change: null };
    case "status_changed":
      return { kind: "status", change: { from: <StatusValue v={d.from} />, to: <StatusValue v={d.to} /> } };
    case "assignees_changed":
      // Сменились только соисполнители — в истории не показываем.
      if (d.from === d.to) return null;
      return { kind: "assignee", change: { from: person(d.from), to: person(d.to) } };
    case "updated":
      return d.due_changed === true
        ? { kind: "due", change: { from: date(d.from_due), to: date(d.to_due) } }
        : { kind: "updated", change: null };
    case "archived":
      return { kind: "archived", change: null };
    case "restored":
      return { kind: "restored", change: null };
    default:
      return null;
  }
}

function Svg({ className = "h-3.5 w-3.5", children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}
const WhoIcon = () => (
  <Svg className="h-3 w-3">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);
const FromIcon = () => (
  <Svg className="h-3 w-3">
    <circle cx="12" cy="12" r="8" />
  </Svg>
);
const ToIcon = () => (
  <Svg className="h-3 w-3">
    <circle cx="12" cy="12" r="8" />
    <path d="m8.5 12.3 2.4 2.4 4.6-4.8" />
  </Svg>
);

function KindIcon({ kind }: { kind: Kind }) {
  switch (kind) {
    case "created":
      return (
        <Svg>
          <path d="M12 5v14M5 12h14" />
        </Svg>
      );
    case "status":
      return (
        <Svg>
          <path d="M4 12h12M12 6l6 6-6 6" />
        </Svg>
      );
    case "assignee":
      return (
        <Svg>
          <circle cx="10" cy="8" r="3.5" />
          <path d="M3 20a7 7 0 0 1 11-5.7M17 14v6M14 17h6" />
        </Svg>
      );
    case "due":
      return (
        <Svg>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </Svg>
      );
    case "updated":
      return (
        <Svg>
          <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z" />
        </Svg>
      );
    case "archived":
      return (
        <Svg>
          <rect x="3" y="4" width="18" height="5" rx="1.5" />
          <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
        </Svg>
      );
    case "restored":
      return (
        <Svg>
          <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
          <path d="M4 4v4.5h4.5" />
        </Svg>
      );
  }
}
