"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Sheet } from "@/components/ui/Sheet";
import { setArchived, setAssignees, supabase, taskRights, updateTask } from "./api";
import { DueLabel, PersonChip, PriorityBadge } from "./bits";
import { Comments } from "./Comments";
import { fetchComments, fetchEvents, fetchProfileName, fetchTask, type PagePerson, type TaskComment, type TaskEvent } from "./data";
import { History } from "./History";
import {
  cleanCoassignees,
  joinLocalDateTime,
  sameSet,
  splitLocalDateTime,
  TASK_STATUSES,
  validateTask,
  type Task,
  type TaskFieldErrors,
  type TaskStatus,
} from "./logic";
import { TaskForm, type TaskFormValue } from "./TaskForm";
import { formatDateTime, useNow } from "./time";

type Props = {
  open: boolean;
  taskId: string | null;
  task: Task | null; // null — задачи нет в списке (нет доступа или удалена)
  people: PagePerson[];
  peopleById: Map<string, PagePerson>;
  me: string;
  readOnly: boolean; // страница в архиве или подписка истекла
  onClose: () => void;
  onChanged: () => void; // перечитать список задач
  onStatus: (task: Task, status: TaskStatus) => void;
};

function toForm(task: Task): TaskFormValue {
  const { date, time } = splitLocalDateTime(task.dueAt);
  return {
    title: task.title,
    description: task.description,
    dueDate: date,
    dueTime: time,
    priority: task.priority,
    assigneeId: task.assigneeId,
    coassignees: task.coassignees,
  };
}

function isDirty(form: TaskFormValue, base: Task): boolean {
  const b = toForm(base);
  return (
    form.title !== b.title ||
    form.description !== b.description ||
    form.dueDate !== b.dueDate ||
    form.dueTime !== b.dueTime ||
    form.priority !== b.priority ||
    form.assigneeId !== b.assigneeId ||
    !sameSet(cleanCoassignees(form.coassignees, form.assigneeId), b.coassignees)
  );
}

// Карточка задачи: боковая панель на компьютере, на весь экран на телефоне.
// Открывается для просмотра; редактирование — отдельный режим с «Сохранить».
export function TaskCard({ open, taskId, task, people, peopleById, me, readOnly, onClose, onChanged, onStatus }: Props) {
  const s = t.tasks;
  const now = useNow();
  const [rights, setRights] = useState<{ canEdit: boolean; canWork: boolean } | null>(null);
  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [events, setEvents] = useState<TaskEvent[] | null>(null);
  const [author, setAuthor] = useState<string | null>(null);

  // Режим правки: base — версия задачи, от которой правим; form — что ввели.
  const [base, setBase] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormValue | null>(null);
  const [errors, setErrors] = useState<TaskFieldErrors>({});
  const [error, setError] = useState<ErrorKey | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [askClose, setAskClose] = useState(false);
  const [pending, start] = useTransition();

  // Открыли другую задачу — забываем данные прошлой.
  const [prevId, setPrevId] = useState(taskId);
  if (taskId !== prevId) {
    setPrevId(taskId);
    setRights(null);
    setComments(null);
    setEvents(null);
    setAuthor(null);
    setBase(null);
    setForm(null);
    setErrors({});
    setError(null);
    setNotice(null);
    setAskClose(false);
  }

  const editing = base !== null && form !== null;
  const dirty = editing && isDirty(form, base);

  const loadDetails = useCallback((id: string, isAlive: () => boolean = () => true) => {
    Promise.all([fetchComments(supabase(), id), fetchEvents(supabase(), id)]).then(([c, e]) => {
      if (!isAlive()) return;
      setComments(c);
      setEvents(e);
    });
  }, []);

  // Права, комментарии, история — при открытии и после изменений задачи (version).
  const version = task?.version;
  const assignee = task?.assigneeId;
  useEffect(() => {
    if (!open || !taskId || version === undefined) return;
    let alive = true;
    taskRights(taskId).then((r) => alive && setRights(r));
    loadDetails(taskId, () => alive);
    return () => {
      alive = false;
    };
  }, [open, taskId, version, assignee, loadDetails]);

  // Имя автора — из профилей (он мог уже потерять доступ к странице).
  const createdBy = task?.createdBy ?? null;
  useEffect(() => {
    if (!open || !createdBy || peopleById.has(createdBy)) return;
    let alive = true;
    fetchProfileName(supabase(), createdBy).then((a) => alive && setAuthor(a?.name ?? null));
    return () => {
      alive = false;
    };
  }, [open, createdBy, peopleById]);

  // Новые комментарии приходят сразу (Realtime; RLS отдаёт только доступное).
  useEffect(() => {
    if (!open || !taskId) return;
    const channel = supabase()
      .channel(`task-comments:${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, () => {
        fetchComments(supabase(), taskId).then(setComments);
      })
      .subscribe();
    return () => {
      supabase().removeChannel(channel);
    };
  }, [open, taskId]);

  function resetEdit() {
    setBase(null);
    setForm(null);
    setErrors({});
    setError(null);
    setAskClose(false);
  }

  function requestClose() {
    if (dirty) return setAskClose(true);
    resetEdit();
    setNotice(null);
    onClose();
  }

  function startEdit() {
    if (!task) return;
    setBase(task);
    setForm(toForm(task));
    setErrors({});
    setError(null);
    setNotice(null);
  }

  function save() {
    if (!base || !form || !task) return;
    // Дедлайн не меняли — оставляем как есть (даже если он уже прошёл).
    const dueUnchanged = form.dueDate === toForm(base).dueDate && form.dueTime === toForm(base).dueTime;
    const dueAt = dueUnchanged ? base.dueAt : joinLocalDateTime(form.dueDate, form.dueTime);
    const fieldErrors = validateTask({ title: form.title, description: form.description, dueAt });
    if (dueUnchanged) delete fieldErrors.due;
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return setError("fixFields");

    const b = toForm(base);
    const fieldsChanged =
      form.title !== b.title || form.description !== b.description || !dueUnchanged || form.priority !== b.priority;
    const co = cleanCoassignees(form.coassignees, form.assigneeId);
    const peopleChanged = form.assigneeId !== base.assigneeId || !sameSet(co, base.coassignees);

    start(async () => {
      let v = base.version;
      if (fieldsChanged) {
        const res = await updateTask({ taskId: base.id, version: v, title: form.title, description: form.description, dueAt: dueAt!, priority: form.priority });
        if (!res.ok) return fail(res.error);
        v = res.value;
      }
      if (peopleChanged) {
        const res = await setAssignees({ taskId: base.id, version: v, assigneeId: form.assigneeId, coassignees: co });
        if (!res.ok) return fail(res.error, fieldsChanged);
      }
      resetEdit();
      setNotice(s.saved);
      onChanged();
    });
  }

  // Конфликт версий: перечитываем задачу, введённый текст остаётся в форме.
  async function fail(key: ErrorKey, partlySaved = false) {
    if (key === "taskConflict" || partlySaved) {
      const fresh = await fetchTask(supabase(), base!.id);
      if (fresh) setBase(fresh);
      onChanged();
    }
    if (key === "assigneeNoAccess") setErrors((e) => ({ ...e, assignee: key }));
    setError(key);
  }

  function archive(value: boolean) {
    if (!task) return;
    start(async () => {
      const res = await setArchived(task.id, value);
      if (!res.ok) return setError(res.error);
      setError(null);
      onChanged();
    });
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => setNotice(s.linkCopied), () => undefined);
  }

  const archived = task?.archivedAt != null;
  const canEdit = !readOnly && !archived && rights?.canEdit === true;
  const canWork = !readOnly && !archived && rights?.canWork === true;
  const canArchive = !readOnly && rights?.canEdit === true;

  return (
    <Sheet open={open} title={editing ? s.edit : (task?.title ?? s.notFound)} onClose={requestClose}>
      {!task ? (
        <p className="text-base text-ink">{taskId ? s.notFound : null}</p>
      ) : askClose ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-base font-semibold text-ink">{s.unsavedTitle}</p>
          <p className="text-base text-ink">{s.unsavedText}</p>
          <Button type="button" onClick={() => setAskClose(false)}>
            {s.unsavedKeep}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetEdit();
              onClose();
            }}
          >
            {s.unsavedDiscard}
          </Button>
        </div>
      ) : editing ? (
        <div className="flex flex-col gap-4">
          {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
          <TaskForm value={form} onChange={setForm} people={people} me={me} mode="edit" errors={errors} />
          <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-neutral-200 bg-white px-5 py-3">
            <Button type="button" onClick={save} pending={pending} pendingText={s.saving} disabled={!dirty}>
              {s.save}
            </Button>
            <Button type="button" variant="secondary" onClick={requestClose} disabled={pending}>
              {s.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {archived ? <p className="rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-ink">{s.archivedNotice}</p> : null}
          {notice ? <FormMessage kind="notice">{notice}</FormMessage> : null}
          {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              <DueLabel task={task} now={now} />
            </div>
            <p className="whitespace-pre-wrap break-words text-base text-ink">{task.description}</p>
          </div>

          <div role="group" aria-label={s.changeStatus} className="grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1">
            {TASK_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                aria-pressed={task.status === st}
                disabled={!canWork || task.status === st}
                onClick={() => onStatus(task, st)}
                className={`min-h-10 rounded-lg px-2 text-sm font-medium transition-colors ${
                  task.status === st ? "bg-white text-ink shadow-sm" : "text-ink enabled:hover:bg-white/60 disabled:opacity-50"
                }`}
              >
                {s.status[st]}
              </button>
            ))}
          </div>

          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 text-sm">
            <dt className="text-ink">{s.assignee}</dt>
            <dd className="min-w-0">
              <PersonChip person={task.assigneeId ? peopleById.get(task.assigneeId) : undefined} />
            </dd>
            <dt className="text-ink">{s.coassignees}</dt>
            <dd className="flex min-w-0 flex-col gap-1.5">
              {task.coassignees.length === 0 ? (
                <span className="text-ink">{s.coassigneesNone}</span>
              ) : (
                task.coassignees.map((id) => <PersonChip key={id} person={peopleById.get(id)} fallback={s.formerMember} />)
              )}
            </dd>
            <dt className="text-ink">{s.author}</dt>
            <dd className="truncate text-ink">{(createdBy && peopleById.get(createdBy)?.name) || author || s.formerMember}</dd>
            <dt className="text-ink">{s.createdAt}</dt>
            <dd className="text-ink">{now !== null ? formatDateTime(task.createdAt, now) : ""}</dd>
            {task.completedAt ? (
              <>
                <dt className="text-ink">{s.completedAt}</dt>
                <dd className="text-ink">{now !== null ? formatDateTime(task.completedAt, now) : ""}</dd>
              </>
            ) : null}
          </dl>

          <div className="flex flex-col gap-2">
            {canEdit ? (
              <Button type="button" variant="secondary" onClick={startEdit}>
                {s.edit}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={copyLink}>
              {s.copyLink}
            </Button>
            {canArchive ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => archive(!archived)}
                pending={pending}
                pendingText={archived ? s.restoring : s.archiving}
              >
                {archived ? s.restore : s.archive}
              </Button>
            ) : null}
          </div>

          <Comments
            taskId={task.id}
            me={me}
            comments={comments}
            canComment={!readOnly && rights?.canWork === true}
            now={now}
            onChanged={() => loadDetails(task.id)}
          />
          <History events={events} people={peopleById} now={now} />
        </div>
      )}
    </Sheet>
  );
}
