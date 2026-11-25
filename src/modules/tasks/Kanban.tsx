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
import { useRef, useState, useSyncExternalStore } from "react";
import { format, t } from "@/lib/i18n";
import { PlusIcon } from "@/components/nav/icons";
import type { PagePerson } from "./data";
import { COLUMN_PAGE, groupByStatus, isMine, TASK_STATUSES, type Task, type TaskStatus } from "./logic";
import { CommentIcon, DueShort, Faces, PriorityBadge, STATUS_DOT } from "./bits";
import { formatDueShort } from "./time";

type Props = {
  tasks: Task[]; // уже отфильтрованные и отсортированные
  people: Map<string, PagePerson>;
  me: string;
  now: number | null;
  readOnly: boolean;
  canMove: (task: Task) => boolean;
  onMove: (task: Task, status: TaskStatus) => void;
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
  mobileStatus: TaskStatus; // какая вкладка открыта на телефоне
  onMobileStatus: (status: TaskStatus) => void;
};

// Компьютер — три колонки; телефон — вкладки статусов и одна колонка (без прокрутки вбок).
const wideQuery = "(min-width: 768px)";
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(wideQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useWide(): boolean {
  // До загрузки в браузере — телефонный вид: пилот работает в основном с телефонов.
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => false);
}

const TAB_PREFIX = "tab:";

// Доска (ТЗ, раздел 12). Перетаскивание сразу сохраняет статус (оптимистично; при ошибке карточка
// возвращается — это делает onMove). На телефоне перетаскивание — после удержания ~200 мс,
// чтобы список можно было листать; бросить карточку можно на вкладку другого статуса.
export function Kanban(props: Props) {
  const { tasks, people, me, now, canMove, onMove, onOpen } = props;
  const wide = useWide();
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
    const raw = e.over?.id ? String(e.over.id) : undefined;
    const to = (raw?.startsWith(TAB_PREFIX) ? raw.slice(TAB_PREFIX.length) : raw) as TaskStatus | undefined;
    if (task && to && TASK_STATUSES.includes(to) && to !== task.status) onMove(task, to);
  }
  function open(task: Task) {
    if (Date.now() - justDropped.current < 250) return;
    onOpen(task);
  }

  const column = (status: TaskStatus) => {
    const list = groups[status];
    const limit = limits[status];
    return (
      <>
        {list.slice(0, limit).map((task) => (
          <DraggableCard key={task.id} task={task} people={people} me={me} now={now} disabled={!canMove(task)} onOpen={open} />
        ))}
        {list.length === 0 ? <p className="px-2 py-8 text-center text-sm text-muted">{t.tasks.columnEmpty}</p> : null}
        {list.length > limit ? (
          <button
            type="button"
            onClick={() => setLimits((l) => ({ ...l, [status]: l[status] + COLUMN_PAGE }))}
            className="h-10 rounded-xl text-sm font-medium text-muted hover:bg-white/70"
          >
            {t.tasks.showMore} · {list.length - limit}
          </button>
        ) : null}
      </>
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {wide ? (
        <div aria-label={t.tasks.columns} className="grid grid-cols-3 gap-4 rounded-3xl bg-surface p-4">
          {TASK_STATUSES.map((status) => (
            <Column key={status} status={status} count={groups[status].length} readOnly={props.readOnly} onAdd={props.onAdd}>
              {column(status)}
            </Column>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div role="tablist" aria-label={t.tasks.columns} className="grid grid-cols-3 gap-1.5">
            {TASK_STATUSES.map((status) => (
              <StatusTab
                key={status}
                status={status}
                count={groups[status].length}
                active={props.mobileStatus === status}
                onSelect={() => props.onMobileStatus(status)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-3">{column(props.mobileStatus)}</div>
          {!props.readOnly && tasks.length > 0 ? <p className="text-center text-xs text-muted">{t.tasks.dragHintTabs}</p> : null}
        </div>
      )}
      <DragOverlay dropAnimation={null}>
        {dragging ? <CardBody task={dragging} people={people} me={me} now={now} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  count,
  readOnly,
  onAdd,
  children,
}: {
  status: TaskStatus;
  count: number;
  readOnly: boolean;
  onAdd: (status: TaskStatus) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const s = t.tasks;
  return (
    <section
      ref={setNodeRef}
      aria-label={s.status[status]}
      className={`flex min-w-0 flex-col gap-3 rounded-2xl p-1 transition-colors ${isOver ? "bg-white/70 ring-2 ring-accent/30" : ""}`}
    >
      <h3 className="flex items-center gap-2 px-1.5 pt-1 text-[15px] font-semibold text-ink">
        <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[status] }} aria-hidden />
        {s.status[status]}
        <span className="text-[13px] font-medium text-muted">{count}</span>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => onAdd(status)}
            aria-label={format(s.addInColumn, { status: s.status[status] })}
            title={format(s.addInColumn, { status: s.status[status] })}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-neutral-50"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

// Вкладка статуса на телефоне: на неё же можно бросить карточку.
function StatusTab({ status, count, active, onSelect }: { status: TaskStatus; count: number; active: boolean; onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${TAB_PREFIX}${status}` });
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={`flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium transition-colors ${
        active ? "bg-ink text-white" : "bg-surface text-ink"
      } ${isOver ? "ring-2 ring-accent" : ""}`}
    >
      <span className="text-base font-semibold leading-none">{count}</span>
      {t.tasks.statusShort[status]}
    </button>
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
      className={`rounded-2xl touch-manipulation select-none [-webkit-touch-callout:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isDragging ? "border-2 border-dashed border-line" : ""
      }`}
    >
      {/* Пока карточку тащат, на её месте — пунктирная «лунка» того же размера. */}
      <div className={isDragging ? "invisible" : ""}>
        <CardBody task={task} people={people} me={me} now={now} />
      </div>
    </div>
  );
}

// Карточка задачи на доске. «Готово» — компактно: зачёркнутое название и дата выполнения.
// Свои задачи (ответственный или соисполнитель) — с тёплой обводкой.
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
  const s = t.tasks;
  const mine = isMine(task, me);
  const done = task.status === "done";
  const ids = [...(task.assigneeId ? [task.assigneeId] : []), ...task.coassignees];
  return (
    <article
      className={`flex cursor-pointer flex-col gap-2.5 rounded-2xl bg-white px-3.5 pb-3 pt-3.5 text-left transition-shadow duration-200 hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)] ${
        mine ? "shadow-[0_0_0_1.5px_#f3b39c,0_4px_12px_rgba(234,95,53,0.10)]" : "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)]"
      } ${lifted ? "rotate-2 shadow-[0_18px_40px_rgba(0,0,0,0.16)]!" : ""} ${done ? "opacity-90" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
      </div>
      <h4
        className={`break-words text-[15px] font-semibold leading-snug tracking-[-0.01em] ${
          done ? "text-muted line-through decoration-neutral-400" : "text-ink"
        }`}
      >
        {task.title}
      </h4>
      {!done ? <p className="line-clamp-2 break-words text-[13px] leading-[1.45] text-muted">{task.description}</p> : null}
      <div className="flex items-center gap-2.5 border-t border-[#f0ede9] pt-2.5">
        {done ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ background: "var(--branch-2-strong)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" className="h-[11px] w-[11px]" aria-hidden>
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            {now !== null && task.completedAt ? format(s.completedOn, { date: formatDueShort(task.completedAt, now).toLowerCase() }) : s.status.done}
          </span>
        ) : (
          <DueShort task={task} now={now} />
        )}
        <span className="flex-1" />
        {task.comments > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted" aria-label={format(s.commentsCount, { n: task.comments })}>
            <CommentIcon />
            {task.comments}
          </span>
        ) : null}
        <Faces ids={ids} people={people} size={24} />
      </div>
    </article>
  );
}
