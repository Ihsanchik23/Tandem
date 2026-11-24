"use client";

import { t } from "@/lib/i18n";
import { Avatar } from "@/components/profile/Avatar";
import type { PagePerson } from "./data";
import { isOverdue, type Task, type TaskPriority } from "./logic";
import { formatDateTime } from "./time";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  low: "bg-neutral-100 text-ink",
  normal: "bg-neutral-100 text-ink",
  high: "bg-amber-100 text-amber-900",
  urgent: "bg-red-100 text-red-800",
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[priority]}`}>
      {t.tasks.priority[priority]}
    </span>
  );
}

// Дедлайн; если прошёл, а задача не готова — красная отметка «Просрочено» (это не статус).
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

export function PersonChip({ person, size = 24, fallback }: { person: PagePerson | undefined; size?: number; fallback?: string }) {
  if (!person) return <span className="text-sm text-ink">{fallback ?? t.tasks.noAssignee}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar url={person.avatarUrl} name={person.name} size={size} />
      <span className="truncate text-sm text-ink">{person.name}</span>
    </span>
  );
}
