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
import { COLUMN_PAGE, groupByStatus, TASK_STATUSES, type Task, type TaskStatus } from "./logic";
import { COLUMN, CommentIcon, DueShort, Faces, PriorityBadge } from "./bits";
import { formatDueShort } from "./time";

type Props = {
  tasks: Task[]; // уже отфильтрованные и отсортированные
  people: Map<string, PagePerson>;
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

// Доска (ТЗ, раздел 12): колонки серые (bg-surface), статус — цветная точка у заголовка. Перетаскивание сразу сохраняет статус
// (оптимистично; при ошибке карточка возвращается — это делает onMove). На телефоне — после удержания
// ~200 мс, чтобы список можно было листать; бросить карточку можно на вкладку другого статуса.
export function Kanban(props: Props) {
  const { tasks, people, now, canMove, onMove, onOpen } = props;
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

  const cards = (status: TaskStatus) => {
    const list = groups[status];
    const limit = limits[status];
    return (
      <>
        {list.slice(0, limit).map((task) => (
          <DraggableCard key={task.id} task={task} people={people} now={now} disabled={!canMove(task)} onOpen={open} />
        ))}
        {list.length === 0 ? <p className="px-2 py-6 text-center text-[13px] text-muted">{t.tasks.columnEmpty}</p> : null}
        {list.length > limit ? (
          <button
            type="button"
            onClick={() => setLimits((l) => ({ ...l, [status]: l[status] + COLUMN_PAGE }))}
            className="h-9 rounded-full text-[13px] font-medium text-ink hover:bg-line"
          >
            {t.tasks.showMore} · {list.length - limit}
          </button>
        ) : null}
        {!props.readOnly ? <AddButton status={status} onAdd={props.onAdd} /> : null}
      </>
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      {wide ? (
        <div aria-label={t.tasks.columns} className="grid grid-cols-3 items-start gap-4">
          {TASK_STATUSES.map((status) => (
            <Column key={status} status={status} count={groups[status].length}>
              {cards(status)}
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
          <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-2.5">
            {cards(props.mobileStatus)}
          </div>
          {!props.readOnly && tasks.length > 0 ? <p className="text-center text-[11px] text-muted">{t.tasks.dragHintTabs}</p> : null}
        </div>
      )}
      <DragOverlay dropAnimation={null}>
        {dragging ? <CardBody task={dragging} people={people} now={now} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, count, children }: { status: TaskStatus; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const c = COLUMN[status];
  return (
    <section
      ref={setNodeRef}
      aria-label={t.tasks.status[status]}
      // Карточку несут над колонкой — колонка чуть темнеет (только заливка, без рамок).
      className={`flex min-w-0 flex-col gap-2.5 rounded-[20px] p-3 transition-colors ${isOver ? "bg-line" : "bg-surface"}`}
    >
      <h3 className="flex items-center gap-2 px-1.5 pb-1 pt-1">
        <span className="h-2 w-2 rounded-full" style={{ background: c.strong }} aria-hidden />
        <span className="text-[15px] font-semibold text-ink">{t.tasks.status[status]}</span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-semibold text-ink">
          {count}
        </span>
      </h3>
      {children}
    </section>
  );
}

// Серая таблетка внизу колонки: задача создаётся сразу в этом статусе.
function AddButton({ status, onAdd }: { status: TaskStatus; onAdd: (status: TaskStatus) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAdd(status)}
      aria-label={format(t.tasks.addInColumn, { status: t.tasks.status[status] })}
      className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-line text-[13px] font-medium text-ink transition-colors hover:bg-neutral-300/70"
    >
      <PlusIcon className="h-4 w-4" />
      {t.tasks.addTask}
    </button>
  );
}

// Вкладка статуса на телефоне: выбранная — чёрная (docs/design.md); на неё же можно бросить карточку.
function StatusTab({ status, count, active, onSelect }: { status: TaskStatus; count: number; active: boolean; onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${TAB_PREFIX}${status}` });
  const c = COLUMN[status];
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={`flex h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
        active ? "bg-ink text-white" : isOver ? "bg-line text-ink" : "bg-surface text-ink"
      }`}
    >
      <span className="text-[17px] font-semibold leading-none">{count}</span>
      <span className={`flex items-center gap-1 text-[11px] font-medium ${active ? "text-white" : "text-muted"}`}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.strong }} aria-hidden />
        {t.tasks.statusShort[status]}
      </span>
    </button>
  );
}

function DraggableCard({
  task,
  people,
  now,
  disabled,
  onOpen,
}: {
  task: Task;
  people: Map<string, PagePerson>;
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
        isDragging ? "bg-line" : ""
      }`}
    >
      {/* Пока карточку тащат, на её месте — серая «лунка» того же размера. */}
      <div className={isDragging ? "invisible" : ""}>
        <CardBody task={task} people={people} now={now} />
      </div>
    </div>
  );
}

// Карточка задачи: сверху мелко приоритет и дедлайн, крупнее — название, внизу люди и комментарии.
// «Готово» — зачёркнутое название и дата выполнения. Белая на серой колонке, без теней (тень — только у поднятой).
export function CardBody({
  task,
  people,
  now,
  lifted = false,
}: {
  task: Task;
  people: Map<string, PagePerson>;
  now: number | null;
  lifted?: boolean;
}) {
  const s = t.tasks;
  const done = task.status === "done";
  const ids = [...(task.assigneeId ? [task.assigneeId] : []), ...task.coassignees];
  return (
    <article
      className={`flex cursor-pointer flex-col gap-2 rounded-2xl bg-white p-3.5 text-left ${lifted ? "rotate-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)]" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {done ? null : <DueShort task={task} now={now} />}
      </div>
      <h4
        className={`break-words text-[14px] font-semibold leading-[1.35] tracking-[-0.01em] ${
          done ? "text-muted line-through decoration-neutral-400" : "text-ink"
        }`}
      >
        {task.title}
      </h4>
      <div className="flex items-center gap-2 pt-1">
        <Faces ids={ids} people={people} size={22} />
        <span className="flex-1" />
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
            <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "var(--branch-2-strong)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden>
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
            {now !== null && task.completedAt ? format(s.completedOn, { date: formatDueShort(task.completedAt, now).toLowerCase() }) : s.status.done}
          </span>
        ) : null}
        {task.comments > 0 ? (
          <span
            className="inline-flex h-6 items-center gap-1 rounded-full bg-surface px-2 text-[11px] font-medium text-muted"
            aria-label={format(s.commentsCount, { n: task.comments })}
          >
            <CommentIcon className="h-3 w-3" />
            {task.comments}
          </span>
        ) : null}
      </div>
    </article>
  );
}
