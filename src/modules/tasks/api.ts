"use client";

// Изменения задач — только через функции базы (RPC). Права, версии и подписку проверяет база;
// здесь — вызов и перевод ошибки в понятный текст.
import { createClient } from "@/lib/supabase/client";
import type { ErrorKey } from "@/lib/i18n/ru";
import { cleanCoassignees, taskDbError, type TaskPriority, type TaskStatus } from "./logic";

export type ApiResult<T = undefined> = { ok: true; value: T } | { ok: false; error: ErrorKey };

let client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  client ??= createClient();
  return client;
}

type RpcResponse = { data: unknown; error: { code?: string; message?: string } | null };

async function call<T>(fn: () => PromiseLike<RpcResponse>): Promise<ApiResult<T>> {
  try {
    const { data, error } = await fn();
    if (error) return { ok: false, error: taskDbError(error) };
    return { ok: true, value: data as T };
  } catch {
    return { ok: false, error: "network" };
  }
}

export function createTask(input: {
  pageId: string;
  title: string;
  description: string;
  dueAt: string;
  priority: TaskPriority;
  assigneeId: string | null;
  coassignees: string[];
}) {
  return call<string>(() =>
    supabase().rpc("create_task", {
      p_page: input.pageId,
      p_title: input.title.trim(),
      p_description: input.description.trim(),
      p_due_at: input.dueAt,
      p_priority: input.priority,
      p_assignee: input.assigneeId ?? undefined,
      p_coassignees: cleanCoassignees(input.coassignees, input.assigneeId),
    }),
  );
}

// Возвращает новую версию задачи.
export function updateTask(input: { taskId: string; version: number; title: string; description: string; dueAt: string; priority: TaskPriority }) {
  return call<number>(() =>
    supabase().rpc("update_task", {
      p_task: input.taskId,
      p_expected_version: input.version,
      p_title: input.title.trim(),
      p_description: input.description.trim(),
      p_due_at: input.dueAt,
      p_priority: input.priority,
    }),
  );
}

export function setAssignees(input: { taskId: string; version: number; assigneeId: string | null; coassignees: string[] }) {
  return call<number>(() =>
    supabase().rpc("set_task_assignees", {
      p_task: input.taskId,
      p_expected_version: input.version,
      // null — «без ответственного»: база ждёт uuid или null.
      p_assignee: input.assigneeId as string,
      p_coassignees: cleanCoassignees(input.coassignees, input.assigneeId),
    }),
  );
}

export function setStatus(taskId: string, status: TaskStatus) {
  return call<number>(() => supabase().rpc("set_task_status", { p_task: taskId, p_status: status }));
}

export function setArchived(taskId: string, archived: boolean) {
  return call<undefined>(() => supabase().rpc("set_task_archived", { p_task: taskId, p_archived: archived }));
}

export function addComment(taskId: string, body: string) {
  return call<string>(() => supabase().rpc("add_task_comment", { p_task: taskId, p_body: body.trim() }));
}

export function editComment(commentId: string, body: string) {
  return call<undefined>(() => supabase().rpc("edit_task_comment", { p_comment: commentId, p_body: body.trim() }));
}

export function deleteComment(commentId: string) {
  return call<undefined>(() => supabase().rpc("delete_task_comment", { p_comment: commentId }));
}

// Права на кнопки внутри карточки — спрашиваем базу (то же правило, что она применит).
export async function taskRights(taskId: string): Promise<{ canEdit: boolean; canWork: boolean }> {
  const [edit, work] = await Promise.all([
    supabase().rpc("can_edit_task", { p_task: taskId }),
    supabase().rpc("can_work_task", { p_task: taskId }),
  ]);
  return { canEdit: edit.data === true, canWork: work.data === true };
}
