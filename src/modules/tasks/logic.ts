// Модуль «Задачи» (ТЗ, раздел 12): чистые функции без сервера — покрыты тестами.
import type { ErrorKey } from "../../lib/i18n/ru.ts";
import { companyDbError } from "../../lib/company/validation.ts";

export const TASK_LIMITS = { title: 200, description: 5000, comment: 2000 } as const;
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const COLUMN_PAGE = 20; // карточек в колонке до «Показать ещё»

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  coassignees: string[];
  dueAt: string;
  createdAt: string;
  createdBy: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  version: number;
};

export type TaskRole = "owner" | "admin" | "manager" | "employee";

// ---------- Проверка формы (те же ограничения, что в базе) ----------
export type TaskInput = { title: string; description: string; dueAt: string | null };
export type TaskFieldErrors = Partial<Record<"title" | "description" | "due" | "assignee", ErrorKey>>;

export function validateTask(input: TaskInput, now = Date.now()): TaskFieldErrors {
  const errors: TaskFieldErrors = {};
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) errors.title = "taskTitleRequired";
  else if (title.length > TASK_LIMITS.title) errors.title = "taskTitleTooLong";
  if (!description) errors.description = "taskDescriptionRequired";
  else if (description.length > TASK_LIMITS.description) errors.description = "taskDescriptionTooLong";
  if (!input.dueAt || Number.isNaN(new Date(input.dueAt).getTime())) errors.due = "dueRequired";
  else if (new Date(input.dueAt).getTime() <= now) errors.due = "dueInPast";
  return errors;
}

export function validateComment(body: string): ErrorKey | null {
  const b = body.trim();
  if (!b) return "commentRequired";
  if (b.length > TASK_LIMITS.comment) return "commentTooLong";
  return null;
}

// Поля «дата» и «время» в форме (местное время телефона) ↔ момент времени ISO.
export function joinLocalDateTime(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const value = new Date(y!, m! - 1, d!, hh!, mm!);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function splitLocalDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

// ---------- Ошибки базы → понятный текст ----------
export function taskDbError(error: { code?: string | null; message?: string | null }): ErrorKey {
  const m = error.message ?? "";
  const byCode: Record<string, ErrorKey> = {
    page_unavailable: "pageUnavailable",
    task_conflict: "taskConflict",
    due_in_past: "dueInPast",
    self_assign_forbidden: "selfAssignForbidden",
    assignee_no_access: "assigneeNoAccess",
  };
  if (byCode[m]) return byCode[m];
  if (error.code === "23514") {
    if (m.includes("title")) return "taskTitleTooLong";
    if (m.includes("description")) return "taskDescriptionTooLong";
    if (m.includes("body")) return "commentTooLong";
    return "fixFields";
  }
  if (/fetch|network/i.test(m)) return "network";
  return companyDbError(error).key;
}

// ---------- Кто что может (только для показа кнопок — права проверяет база) ----------
// Поля, назначения, архив: автор, Owner, Admin, Manager.
export function canEditTask(task: Pick<Task, "createdBy">, me: string, role: TaskRole | null): boolean {
  return task.createdBy === me || role === "owner" || role === "admin" || role === "manager";
}
// Статус и комментарии: всё выше плюс ответственный и соисполнители.
export function canWorkTask(task: Pick<Task, "createdBy" | "assigneeId" | "coassignees">, me: string, role: TaskRole | null): boolean {
  return canEditTask(task, me, role) || task.assigneeId === me || task.coassignees.includes(me);
}
export function isMine(task: Pick<Task, "assigneeId" | "coassignees">, me: string): boolean {
  return task.assigneeId === me || task.coassignees.includes(me);
}

// Просрочка — вычисляемая отметка, не статус: дедлайн прошёл, а задача не готова.
export function isOverdue(task: Pick<Task, "dueAt" | "status">, now = Date.now()): boolean {
  return task.status !== "done" && new Date(task.dueAt).getTime() < now;
}

// ---------- Фильтры (общие для доски и списка) ----------
export type TaskFilters = {
  query: string;
  mine: boolean;
  overdue: boolean;
  assignee: "any" | "none" | string; // "none" — «Требуют переназначения»
  priority: "any" | TaskPriority;
  status: "any" | TaskStatus; // только в списке
};
export const EMPTY_FILTERS: TaskFilters = { query: "", mine: false, overdue: false, assignee: "any", priority: "any", status: "any" };

export function hasActiveFilters(f: TaskFilters): boolean {
  return f.mine || f.overdue || f.assignee !== "any" || f.priority !== "any" || f.status !== "any";
}

export function filterTasks(tasks: Task[], f: TaskFilters, me: string, now = Date.now()): Task[] {
  const q = f.query.trim().toLowerCase();
  return tasks.filter(
    (t) =>
      (!q || t.title.toLowerCase().includes(q)) &&
      (!f.mine || isMine(t, me)) &&
      (!f.overdue || isOverdue(t, now)) &&
      (f.assignee === "any" || (f.assignee === "none" ? t.assigneeId === null : t.assigneeId === f.assignee)) &&
      (f.priority === "any" || t.priority === f.priority) &&
      (f.status === "any" || t.status === f.status),
  );
}

// Порядок: ближайший дедлайн выше; при равенстве — срочнее выше.
const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => a.dueAt.localeCompare(b.dueAt) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id.localeCompare(b.id),
  );
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) groups[t.status].push(t);
  return groups;
}

// Оптимистичный перенос по доске: новая копия списка, задача с новым статусом.
export function withStatus(tasks: Task[], id: string, status: TaskStatus): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, status, completedAt: status === "done" ? (t.completedAt ?? new Date().toISOString()) : null } : t));
}

// ---------- «создано N назад» ----------
export type AgoParts = { kind: "now" } | { kind: "minutes" | "hours" | "days"; n: number };
export function agoParts(iso: string, now = Date.now()): AgoParts {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return { kind: "now" };
  if (min < 60) return { kind: "minutes", n: min };
  const h = Math.floor(min / 60);
  if (h < 24) return { kind: "hours", n: h };
  return { kind: "days", n: Math.floor(h / 24) };
}

// Список соисполнителей без ответственного и без повторов.
export function cleanCoassignees(co: string[], assignee: string | null): string[] {
  return [...new Set(co)].filter((id) => id !== assignee);
}

export function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
