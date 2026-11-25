"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { PlusIcon } from "@/components/nav/icons";
import { FormMessage } from "@/components/ui/FormMessage";
import { setStatus, supabase } from "./api";
import { CreateTask } from "./CreateTask";
import { fetchPageTasks, type PagePerson } from "./data";
import { Filters } from "./Filters";
import { Kanban } from "./Kanban";
import {
  canWorkTask,
  EMPTY_FILTERS,
  filterTasks,
  hasActiveFilters,
  isOverdue,
  sortTasks,
  withStatus,
  type Task,
  type TaskFilters,
  type TaskRole,
  type TaskStatus,
} from "./logic";
import { TaskCard } from "./TaskCard";
import { TaskList } from "./TaskList";
import { useNow } from "./time";

type Tab = "board" | "list" | "archive";

type Props = {
  pageId: string;
  me: string;
  role: TaskRole | null;
  readOnly: boolean;
  initialTasks: Task[];
  people: PagePerson[];
};

function BoardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-[15px] w-[15px]" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
      <rect x="3" y="4" width="18" height="5" rx="1.5" />
      <path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4" />
    </svg>
  );
}

// Страница модуля «Задачи»: «Доска / Список / Архив», поиск и фильтры, карточка задачи.
// Прямая ссылка на задачу — ?task=<id>: открывает её карточку (если есть доступ).
export function TasksBoard({ pageId, me, role, readOnly, initialTasks, people }: Props) {
  const s = t.tasks;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params.get("task");
  const now = useNow();

  const [tasks, setTasks] = useState(initialTasks);
  const [tab, setTab] = useState<Tab>("board");
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  // Создание: в каком статусе (кнопка «+» у колонки) или null — окно закрыто.
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  // Вкладка статуса на телефоне.
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>("todo");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Последняя открытая задача — чтобы панель плавно уехала, не опустев.
  const [shownId, setShownId] = useState(openId);
  if (openId && openId !== shownId) setShownId(openId);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.userId, p])), [people]);

  // Перечитать список (после своих действий и событий Realtime). Несколько событий подряд — один запрос.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reload = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const fresh = await fetchPageTasks(supabase(), pageId);
      if (fresh) setTasks(fresh);
    }, 250);
  }, [pageId]);

  // Изменения других людей приходят сразу. RLS пропускает только события доступной страницы.
  useEffect(() => {
    const channel = supabase()
      .channel(`tasks:${pageId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `page_id=eq.${pageId}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments" }, reload)
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [pageId, reload]);

  const active = useMemo(() => tasks.filter((x) => !x.archivedAt), [tasks]);
  const archived = useMemo(() => tasks.filter((x) => x.archivedAt), [tasks]);
  const inTab = tab === "archive" ? archived : active;
  // Фильтр «статус» есть только в списке; на доске статусы — это колонки.
  // До загрузки в браузере времени нет (now = null): просроченных не считаем.
  const effective = useMemo(() => (tab === "board" ? { ...filters, status: "any" as const } : filters), [tab, filters]);
  const shown = useMemo(() => sortTasks(filterTasks(inTab, effective, me, now ?? 0)), [inTab, effective, me, now]);
  const overdueCount = useMemo(() => (now === null ? 0 : active.filter((x) => isOverdue(x, now)).length), [active, now]);

  function openTask(task: Task) {
    router.push(`${pathname}?task=${task.id}`, { scroll: false });
  }
  function closeTask() {
    router.replace(pathname, { scroll: false });
  }

  // Перенос по доске или кнопка статуса: сразу двигаем карточку, при ошибке возвращаем.
  async function move(task: Task, status: TaskStatus) {
    const before = task.status;
    setTasks((list) => withStatus(list, task.id, status));
    setError(null);
    const res = await setStatus(task.id, status);
    if (!res.ok) {
      setTasks((list) => withStatus(list, task.id, before));
      setError(res.error);
      return;
    }
    setNotice(format(s.moved, { status: s.status[status] }));
    reload();
  }

  // Подсказка о переносе исчезает сама.
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  const tabs: { key: Tab; label: string; Icon: () => React.ReactElement }[] = [
    { key: "board", label: s.tabBoard, Icon: BoardIcon },
    { key: "list", label: s.tabList, Icon: ListIcon },
    { key: "archive", label: archived.length ? `${s.tabArchive} · ${archived.length}` : s.tabArchive, Icon: ArchiveIcon },
  ];
  const filtered = hasActiveFilters(effective) || filters.query.trim() !== "";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div role="tablist" className="flex shrink-0 gap-0.5 rounded-xl bg-surface p-1">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex h-[34px] flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3.5 text-sm font-medium text-ink transition-colors md:flex-none ${
                tab === key ? "bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "hover:bg-white/60"
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
        <Filters value={filters} onChange={setFilters} people={people} withStatus={tab === "list"} overdueCount={overdueCount} />
        {!readOnly ? (
          <button
            type="button"
            onClick={() => setCreating("todo")}
            className="hidden h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-[18px] text-sm font-semibold text-white shadow-[0_6px_16px_rgba(234,95,53,0.3)] hover:bg-brand-hover md:inline-flex"
          >
            <PlusIcon className="h-4 w-4" />
            {s.create}
          </button>
        ) : null}
      </div>

      {readOnly ? <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink">{s.readOnly}</p> : null}

      <div aria-live="polite" className="empty:hidden">
        {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : notice ? <FormMessage kind="notice">{notice}</FormMessage> : null}
      </div>

      {inTab.length === 0 && tab !== "board" ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-4 py-12 text-center">
          <p className="text-base font-medium text-ink">{tab === "archive" ? s.emptyArchive : s.empty}</p>
          {tab !== "archive" && !readOnly ? (
            <button type="button" onClick={() => setCreating("todo")} className="text-base font-medium text-accent underline underline-offset-4">
              {s.emptyCreate}
            </button>
          ) : null}
        </div>
      ) : shown.length === 0 && filtered && tab !== "board" ? (
        <p className="rounded-3xl bg-surface px-4 py-10 text-center text-base text-ink">{s.emptyFiltered}</p>
      ) : tab === "board" ? (
        <Kanban
          tasks={shown}
          people={peopleById}
          me={me}
          now={now}
          readOnly={readOnly}
          canMove={(task) => !readOnly && canWorkTask(task, me, role)}
          onMove={move}
          onOpen={openTask}
          onAdd={setCreating}
          mobileStatus={mobileStatus}
          onMobileStatus={setMobileStatus}
        />
      ) : (
        <TaskList tasks={shown} people={peopleById} me={me} now={now} onOpen={openTask} />
      )}

      {/* Телефон: кнопка «+» всегда под пальцем, создаёт задачу в открытой вкладке статуса. */}
      {!readOnly ? (
        <button
          type="button"
          onClick={() => setCreating(tab === "board" ? mobileStatus : "todo")}
          aria-label={s.create}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand text-white shadow-[0_10px_24px_rgba(234,95,53,0.4)] md:hidden"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      ) : null}

      <TaskCard
        open={openId !== null}
        taskId={shownId}
        task={tasks.find((x) => x.id === shownId) ?? null}
        people={people}
        peopleById={peopleById}
        me={me}
        readOnly={readOnly}
        onClose={closeTask}
        onChanged={reload}
        onStatus={move}
      />
      {!readOnly ? (
        <CreateTask
          open={creating !== null}
          status={creating ?? "todo"}
          pageId={pageId}
          people={people}
          me={me}
          onClose={() => setCreating(null)}
          onCreated={() => {
            setCreating(null);
            reload();
          }}
        />
      ) : null}
    </section>
  );
}
