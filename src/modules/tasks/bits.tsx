"use client";

import { format, t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import type { PagePerson } from "./data";
import { isOverdue, type Task, type TaskPriority, type TaskStatus } from "./logic";
import { formatDateTime, formatDueShort } from "./time";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  urgent: "bg-red-100 text-red-800",
  high: "bg-amber-100 text-amber-900",
  normal: "bg-neutral-100 text-ink",
  low: "bg-sky-50 text-slate-700",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold ${PRIORITY_STYLE[priority]}`}>
      {t.tasks.priority[priority]}
    </span>
  );
}

// Цвета статусов (палитра из globals.css): на доске — только точка у заголовка колонки и в карточке задачи.
const columnOf = (n: number) => ({
  bg: `var(--branch-${n}-bg)`,
  strong: `var(--branch-${n}-strong)`,
  line: `var(--branch-${n}-line)`,
  text: `var(--branch-${n}-text)`,
});
export const COLUMN: Record<TaskStatus, ReturnType<typeof columnOf>> = {
  todo: columnOf(1), // сиреневый
  in_progress: columnOf(3), // персиковый
  done: columnOf(2), // мятный
};
export const STATUS_DOT: Record<TaskStatus, string> = {
  todo: COLUMN.todo.strong,
  in_progress: COLUMN.in_progress.strong,
  done: COLUMN.done.strong,
};

export function CalendarIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

export function CommentIcon({ className = "h-[14px] w-[14px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}

// Дедлайн на карточке — минимально: значок и короткая дата. Прошёл, а задача не готова — красным.
export function DueShort({ task, now }: { task: Pick<Task, "dueAt" | "status">; now: number | null }) {
  if (now === null) return <span className="inline-block h-3.5 w-16 rounded bg-neutral-100" aria-hidden />;
  const late = isOverdue(task, now);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-medium ${late ? "text-red-700" : "text-muted"}`}
      title={late ? t.tasks.overdue : undefined}
    >
      <CalendarIcon />
      {formatDueShort(task.dueAt, now)}
      {late ? <span className="sr-only">· {t.tasks.overdue}</span> : null}
    </span>
  );
}

// Полный дедлайн (карточка задачи, список): дата и время; просрочка — красной меткой.
export function DueLabel({ task, now }: { task: Pick<Task, "dueAt" | "status">; now: number | null }) {
  if (now === null) return <span className="inline-block h-4 w-20 rounded bg-neutral-100" aria-hidden />;
  const late = isOverdue(task, now);
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 text-sm ${late ? "font-medium text-red-700" : "text-ink"}`}>
      {formatDateTime(task.dueAt, now)}
      {late ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">{t.tasks.overdue}</span> : null}
    </span>
  );
}

// Ответственный и соисполнители стопкой аватаров (до трёх, дальше «+N»).
export function Faces({ ids, people, size = 24 }: { ids: string[]; people: Map<string, PagePerson>; size?: number }) {
  const known = ids.flatMap((id) => (people.get(id) ? [people.get(id)!] : []));
  if (known.length === 0) {
    return (
      <span
        title={t.tasks.noAssignee}
        aria-label={t.tasks.noAssignee}
        className="inline-block shrink-0 rounded-full border-[1.5px] border-dashed border-neutral-400"
        style={{ width: size, height: size }}
      />
    );
  }
  const shown = known.slice(0, 3);
  const rest = known.length - shown.length;
  const names = known.map((p) => p.name).join(", ");
  return (
    <span className="flex shrink-0 items-center" title={names} aria-label={names}>
      {shown.map((p, i) => (
        <span key={p.userId} className="rounded-full ring-2 ring-white" style={{ marginLeft: i === 0 ? 0 : -6 }}>
          <Avatar url={p.avatarUrl} name={p.name} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className="-ml-1.5 flex items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink ring-2 ring-white"
          style={{ width: size, height: size }}
          aria-label={format(t.tasks.peopleMore, { n: rest })}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

export function PersonChip({ person, size = 24, fallback }: { person: PagePerson | undefined; size?: number; fallback?: string }) {
  if (!person) return <span className="text-sm text-ink">{fallback ?? t.tasks.noAssignee}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar url={person.avatarUrl} name={person.name} size={size} />
      <span className="truncate text-sm text-ink">{person.name}</span>
    </span>
  );
}
