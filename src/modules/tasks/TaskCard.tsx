"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { t } from "@/lib/i18n";
import type { ErrorKey } from "@/lib/i18n/ru";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/FormMessage";
import { Sheet } from "@/components/ui/Sheet";
import { subscribeLive } from "@/lib/supabase/realtime";
import { setArchived, setAssignees, supabase, taskRights, updateTask } from "./api";
import { ArchiveBoxIcon, IconButton, LinkIcon, PencilIcon, RestoreIcon } from "@/components/ui/IconButton";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { CalendarIcon, DueLabel, PersonChip, PriorityBadge, STATUS_DOT } from "./bits";
import { Comments } from "./Comments";
import { fetchComments, fetchEvents, fetchProfileName, fetchTask, type PagePerson, type TaskComment, type TaskEvent } from "./data";
import { History } from "./History";
import { AuthorIcon, btnPrimary, btnSecondary, CardHeader, CheckCircleIcon, ClockIcon, FlagIcon, Prop, TextIcon, UserIcon, UsersIcon } from "./parts";
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
    let alive = true;
    const sync = () => {
      fetchComments(supabase(), taskId).then((c) => alive && setComments(c));
    };
    const stop = subscribeLive(
      supabase(),
      `task-comments:${taskId}`,
      (ch) => ch.on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, sync),
      sync,
    );
    return () => {
      alive = false;
      stop();
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

  const authorName = (createdBy && peopleById.get(createdBy)?.name) || author || s.formerMember;
  const showActions = task !== null && !editing && !askClose;

  // Шапка: слева — где я (задача и её статус), справа — компактные действия с подсказками,
  // меню «⋯» (второстепенное) и «Закрыть».
  const header = (
    <CardHeader
      onClose={requestClose}
      title={
        editing ? (
          <span className="text-[15px] font-semibold text-ink">{s.editTitle}</span>
        ) : task ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DOT[task.status] }} aria-hidden />
            {s.status[task.status]}
            {archived ? <span className="text-muted">· {s.archivedNotice}</span> : null}
          </span>
        ) : null
      }
    >
      {showActions && canEdit ? (
        <IconButton label={s.edit} onClick={startEdit}>
          <PencilIcon />
        </IconButton>
      ) : null}
      {showActions && canArchive ? (
        <IconButton label={archived ? s.restore : s.archive} onClick={() => archive(!archived)} disabled={pending}>
          {archived ? <RestoreIcon /> : <ArchiveBoxIcon />}
        </IconButton>
      ) : null}
      {showActions ? <MoreMenu items={[{ key: "link", label: s.copyLink, icon: <LinkIcon />, onSelect: copyLink }]} /> : null}
    </CardHeader>
  );

  // Режим правки: «Отмена» и «Сохранить» закреплены внизу панели.
  const footer =
    task && editing && !askClose ? (
      <>
        <button type="button" onClick={requestClose} disabled={pending} className={btnSecondary}>
          {s.cancel}
        </button>
        <button type="button" onClick={save} disabled={pending || !dirty} className={`${btnPrimary} flex-1 md:flex-none`}>
          {pending ? s.saving : s.save}
        </button>
      </>
    ) : null;

  return (
    <Sheet open={open} from="right" title={editing ? s.editTitle : (task?.title ?? s.notFound)} onClose={requestClose} header={header} footer={footer}>
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
        <div className="flex flex-col gap-4 pt-2">
          {/* Ошибки полей — под самими полями; здесь только общие (сеть, конфликт версий). */}
          {error && error !== "fixFields" && !errors.assignee ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}
          <TaskForm value={form} onChange={setForm} people={people} me={me} mode="edit" errors={errors} />
        </div>
      ) : (
        <div className="flex flex-col gap-7 pt-2">
          {notice ? <FormMessage kind="notice">{notice}</FormMessage> : null}
          {error ? <FormMessage kind="error">{t.errors[error]}</FormMessage> : null}

          {/* Главное на карточке — заголовок. */}
          <h2 className="break-words text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink">{task.title}</h2>

          <StatusControl status={task.status} disabled={!canWork} onChange={(st) => onStatus(task, st)} />

          {/* Свойства: иконка и название слева, значение справа — ровной сеткой. */}
          <dl className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-[14px]">
            <Prop icon={<CalendarIcon className="h-[17px] w-[17px]" />} label={s.due}>
              <DueLabel task={task} now={now} />
            </Prop>
            <Prop icon={<FlagIcon />} label={s.filterPriority}>
              <PriorityBadge priority={task.priority} />
            </Prop>
            <Prop icon={<UserIcon />} label={s.assignee}>
              <PersonChip person={task.assigneeId ? peopleById.get(task.assigneeId) : undefined} />
            </Prop>
            <Prop icon={<UsersIcon />} label={s.coassignees} top={task.coassignees.length > 1}>
              {task.coassignees.length === 0 ? (
                <span className="text-muted">{s.coassigneesNone}</span>
              ) : (
                <span className="flex flex-col gap-1.5 py-1">
                  {task.coassignees.map((id) => (
                    <PersonChip key={id} person={peopleById.get(id)} fallback={s.formerMember} />
                  ))}
                </span>
              )}
            </Prop>
            <Prop icon={<AuthorIcon />} label={s.author}>
              <span className="truncate">{authorName}</span>
            </Prop>
            <Prop icon={<ClockIcon />} label={s.createdAt}>
              {now !== null ? formatDateTime(task.createdAt, now) : ""}
            </Prop>
            {task.completedAt ? (
              <Prop icon={<CheckCircleIcon />} label={s.completedAt}>
                {now !== null ? formatDateTime(task.completedAt, now) : ""}
              </Prop>
            ) : null}
          </dl>

          {task.description ? (
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-[13px] font-medium text-muted">
                <TextIcon />
                {s.description}
              </h3>
              <p className="whitespace-pre-wrap break-words rounded-2xl bg-surface px-4 py-3.5 text-[15px] leading-relaxed text-ink">
                {task.description}
              </p>
            </section>
          ) : null}

          <Comments
            key={`comments-${task.id}`}
            taskId={task.id}
            me={me}
            comments={comments}
            canComment={!readOnly && rights?.canWork === true}
            now={now}
            onChanged={() => loadDetails(task.id)}
          />
          <History key={`history-${task.id}`} events={events} people={peopleById} now={now} />
        </div>
      )}
    </Sheet>
  );
}

// Статус — сегментированный контрол: плашка плавно переезжает к выбранному.
function StatusControl({ status, disabled, onChange }: { status: TaskStatus; disabled: boolean; onChange: (s: TaskStatus) => void }) {
  const s = t.tasks;
  const index = TASK_STATUSES.indexOf(status);
  return (
    <div role="radiogroup" aria-label={s.changeStatus} className="relative grid grid-cols-3 rounded-2xl bg-surface p-1">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-xl bg-white shadow-[0_1px_2px_rgba(30,30,30,0.08),0_4px_12px_-4px_rgba(30,30,30,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: "calc((100% - 0.5rem) / 3)", transform: `translateX(${index * 100}%)` }}
      />
      {TASK_STATUSES.map((st) => {
        const on = st === status;
        return (
          <button
            key={st}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled || on}
            onClick={() => onChange(st)}
            className={`relative flex h-10 items-center justify-center gap-1.5 rounded-xl px-1 text-[13px] font-medium transition-colors ${
              on ? "text-ink" : "text-muted enabled:hover:text-ink"
            } ${disabled && !on ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full transition-opacity" style={{ background: STATUS_DOT[st], opacity: on ? 1 : 0.45 }} aria-hidden />
            <span className="truncate">{s.statusShort[st]}</span>
          </button>
        );
      })}
    </div>
  );
}
