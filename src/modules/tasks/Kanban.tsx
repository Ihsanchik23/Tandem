"use client";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRef, useState } from "react";
import { format, t } from "@/lib/i18n";
import type { PagePerson } from "./data";
import { COLUMN_PAGE, groupByStatus, isMine, TASK_STATUSES, type Task, type TaskStatus } from "./logic";
import { DueLabel, PersonChip, PriorityBadge } from "./bits";
import { formatAgo } from "./time";

type Props = {
  tasks: Task[]; // уже отфильтрованные и отсортированные
  people: Map<string, PagePerson>;
  me: string;
  now: number | null;
  canMove: (task: Task) => boolean;
  onMove: (task: Task, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
};

// Доска: три колонки по статусам. Перетаскивание сразу сохраняет статус (оптимистично,
// при ошибке карточка возвращается — это делает onMove). На телефоне перетаскивание
// начинается после удержания карточки ~200 мс, чтобы доску можно было листать пальцем.
export function Kanban({ tasks, people, me, now, canMove, onMove, onOpen }: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const [dragging, setDragging] = useState<Task | null>(null);
  const [limits, setLimits] = useState<Record<TaskStatus, number>>({ todo: COLUMN_PAGE, in_progress: COLUMN_PAGE, done: COLUMN_PAGE });
  // После перетаскивания браузер может прислать «клик» — не открываем карточку.
  const justDropped = useRef(0);
  const groups = groupByStatus(tasks);

  function onDragStart(e: DragStartEvent) {
    setDragging(tasks.find((x) => x.id === e.active.id) ?? null);
  }
  function onDragEnd(e: DragEndEvent) {
    justDropped.current = Date.now();
    setDragging(null);
    const task = tasks.find((x) => x.id === e.active.id);
    const to = e.over?.id as TaskStatus | undefined;
    if (task && to && to !== task.status) onMove(task, to);
  }
  function open(task: Task) {
    if (Date.now() - justDropped.current < 250) return;
    onOpen(task);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div
        aria-label={t.tasks.columns}
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:snap-none md:overflow-visible md:px-0"
      >
        {TASK_STATUSES.map((status) => {
          const list = groups[status];
          const limit = limits[status];
          return (
            <Column key={status} status={status} count={list.length}>
              {list.slice(0, limit).map((task) => (
                <DraggableCard
                  key={task.id}
                  task={task}
                  people={people}
                  me={me}
                  now={now}
                  disabled={!canMove(task)}
                  onOpen={open}
                />
              ))}
              {list.length === 0 ? <p className="px-2 py-6 text-center text-sm text-ink">{t.tasks.columnEmpty}</p> : null}
              {list.length > limit ? (
                <button
                  type="button"
                  onClick={() => setLimits((l) => ({ ...l, [status]: l[status] + COLUMN_PAGE }))}
                  className="h-10 rounded-xl border border-neutral-300 bg-white text-sm font-medium text-ink hover:bg-neutral-50"
                >
                  {t.tasks.showMore} ({list.length - limit})
                </button>
              ) : null}
            </Column>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? <CardBody task={dragging} people={people} me={me} now={now} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, count, children }: { status: TaskStatus; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={t.tasks.status[status]}
      className={`flex w-[85%] shrink-0 snap-start flex-col gap-2 rounded-2xl p-2 transition-colors md:w-auto md:min-w-0 md:flex-1 ${
        isOver ? "bg-accent/10 ring-2 ring-accent/40" : "bg-neutral-100"
      }`}
    >
      <h3 className="flex items-center justify-between px-2 pt-1 text-sm font-semibold text-ink">
        {t.tasks.status[status]}
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium">{count}</span>
      </h3>
      {children}
    </section>
  );
}

function DraggableCard({
  task,
  people,
  me,
  now,
  disabled,
  onOpen,
}: {
  task: Task;
  people: Map<string, PagePerson>;
  me: string;
  now: number | null;
  disabled: boolean;
  onOpen: (task: Task) => void;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: task.id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-roledescription={undefined}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      // Без выделения текста и системного меню при удержании пальцем.
      className={`touch-manipulation select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-accent ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <CardBody task={task} people={people} me={me} now={now} />
    </div>
  );
}

// Карточка: название, ответственный, дедлайн, приоритет, «создано N назад». Свои — с фоном.
export function CardBody({
  task,
  people,
  me,
  now,
  lifted = false,
}: {
  task: Task;
  people: Map<string, PagePerson>;
  me: string;
  now: number | null;
  lifted?: boolean;
}) {
  const mine = isMine(task, me);
  return (
    <article
      className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 text-left transition-shadow hover:shadow-sm ${
        mine ? "border-accent/30 bg-accent/5" : "border-neutral-200 bg-white"
      } ${lifted ? "rotate-1 shadow-lg" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 break-words text-base font-medium text-ink">{task.title}</h4>
        <PriorityBadge priority={task.priority} />
      </div>
      <PersonChip person={task.assigneeId ? people.get(task.assigneeId) : undefined} size={22} />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <DueLabel task={task} now={now} />
        {now !== null ? (
          <span className="text-xs text-ink">{format(t.tasks.createdAgo, { ago: formatAgo(task.createdAt, now) })}</span>
        ) : null}
      </div>
    </article>
  );
}
