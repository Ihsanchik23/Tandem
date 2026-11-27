"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { PagePerson } from "./data";
import { COLUMN_PAGE, type Task } from "./logic";
import { DueShort, Faces, PriorityBadge, STATUS_DOT } from "./bits";

// Список: таблица со столбцами статус, ответственный, дедлайн, приоритет. Также — вкладка «Архив».
// Без рамки: шапка — серая таблетка, строки разделены тонкими линиями.
export function TaskList({
  tasks,
  people,
  now,
  onOpen,
}: {
  tasks: Task[];
  people: Map<string, PagePerson>;
  now: number | null;
  onOpen: (task: Task) => void;
}) {
  const s = t.tasks;
  const [limit, setLimit] = useState(COLUMN_PAGE * 2);
  const th = "bg-surface px-4 py-3 text-left text-xs font-semibold text-muted first:rounded-l-full last:rounded-r-full";

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={th}>{s.title}</th>
              <th className={th}>{s.filterStatus}</th>
              <th className={th}>{s.assignee}</th>
              <th className={th}>{s.due}</th>
              <th className={th}>{s.filterPriority}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.slice(0, limit).map((task) => (
              <tr
                key={task.id}
                tabIndex={0}
                onClick={() => onOpen(task)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
                className="cursor-pointer bg-white hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent [&:first-child>td]:border-t-0"
              >
                <td className="max-w-72 border-t border-line px-4 py-3 font-medium text-ink">
                  <span className="line-clamp-2 break-words">{task.title}</span>
                </td>
                <td className="whitespace-nowrap border-t border-line px-4 py-3 text-ink">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[task.status] }} aria-hidden />
                    {s.status[task.status]}
                  </span>
                </td>
                <td className="border-t border-line px-4 py-3">
                  <Faces ids={[...(task.assigneeId ? [task.assigneeId] : []), ...task.coassignees]} people={people} size={24} />
                </td>
                <td className="whitespace-nowrap border-t border-line px-4 py-3">
                  <DueShort task={task} now={now} />
                </td>
                <td className="border-t border-line px-4 py-3">
                  <PriorityBadge priority={task.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tasks.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit((l) => l + COLUMN_PAGE * 2)}
          className="h-11 rounded-full bg-surface text-sm font-medium text-ink hover:bg-line"
        >
          {s.showMore} ({tasks.length - limit})
        </button>
      ) : null}
    </div>
  );
}
