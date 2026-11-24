"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { PagePerson } from "./data";
import { COLUMN_PAGE, isMine, type Task } from "./logic";
import { DueLabel, PersonChip, PriorityBadge } from "./bits";

// Список: таблица со столбцами статус, ответственный, дедлайн, приоритет. Также — вкладка «Архив».
export function TaskList({
  tasks,
  people,
  me,
  now,
  onOpen,
}: {
  tasks: Task[];
  people: Map<string, PagePerson>;
  me: string;
  now: number | null;
  onOpen: (task: Task) => void;
}) {
  const s = t.tasks;
  const [limit, setLimit] = useState(COLUMN_PAGE * 2);
  const th = "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink";

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-neutral-100">
              <th className={`${th} rounded-l-xl`}>{s.title}</th>
              <th className={th}>{s.filterStatus}</th>
              <th className={th}>{s.assignee}</th>
              <th className={th}>{s.due}</th>
              <th className={`${th} rounded-r-xl`}>{s.filterPriority}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.slice(0, limit).map((task) => (
              <tr
                key={task.id}
                tabIndex={0}
                onClick={() => onOpen(task)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(task)}
                className={`cursor-pointer hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-accent ${isMine(task, me) ? "bg-accent/5" : ""}`}
              >
                <td className="max-w-64 border-b border-neutral-200 px-3 py-3 font-medium text-ink">
                  <span className="line-clamp-2 break-words">{task.title}</span>
                </td>
                <td className="whitespace-nowrap border-b border-neutral-200 px-3 py-3 text-ink">{s.status[task.status]}</td>
                <td className="max-w-48 border-b border-neutral-200 px-3 py-3">
                  <PersonChip person={task.assigneeId ? people.get(task.assigneeId) : undefined} size={22} />
                </td>
                <td className="whitespace-nowrap border-b border-neutral-200 px-3 py-3">
                  <DueLabel task={task} now={now} />
                </td>
                <td className="border-b border-neutral-200 px-3 py-3">
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
          className="h-11 rounded-xl border border-neutral-300 bg-white text-sm font-medium text-ink hover:bg-neutral-50"
        >
          {s.showMore} ({tasks.length - limit})
        </button>
      ) : null}
    </div>
  );
}
