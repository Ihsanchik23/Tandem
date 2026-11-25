// Чтение задач. Работает и с серверным, и с браузерным клиентом Supabase:
// сервер отдаёт первый экран, браузер дочитывает после событий Realtime.
// Права решает RLS (видно всё, что на странице с доступом) — здесь только select.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Task, TaskPriority, TaskStatus } from "./logic";

type Client = SupabaseClient<Database>;

export type PagePerson = {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  position: string | null;
};

export function personName(p: { first_name: string | null; last_name: string | null; username: string | null }): string {
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || (p.username ? `@${p.username}` : "");
}

const TASK_COLUMNS =
  "id, title, description, status, priority, assignee_id, due_at, created_at, created_by, completed_at, archived_at, version, task_coassignees(user_id), task_comments(id, deleted_at)";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  due_at: string;
  created_at: string;
  created_by: string | null;
  completed_at: string | null;
  archived_at: string | null;
  version: number;
  task_coassignees: { user_id: string }[] | null;
  task_comments: { id: string; deleted_at: string | null }[] | null;
};

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    assigneeId: r.assignee_id,
    coassignees: (r.task_coassignees ?? []).map((c) => c.user_id),
    dueAt: r.due_at,
    createdAt: r.created_at,
    createdBy: r.created_by,
    completedAt: r.completed_at,
    archivedAt: r.archived_at,
    version: r.version,
    comments: (r.task_comments ?? []).filter((c) => !c.deleted_at).length,
  };
}

// Все задачи страницы, включая архив (в пилоте их немного; «Показать ещё» — на экране).
export async function fetchPageTasks(supabase: Client, pageId: string): Promise<Task[] | null> {
  const { data, error } = await supabase.from("tasks").select(TASK_COLUMNS).eq("page_id", pageId).is("parent_task_id", null);
  if (error) return null;
  return (data as unknown as TaskRow[]).map(toTask);
}

export async function fetchTask(supabase: Client, taskId: string): Promise<Task | null> {
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("id", taskId).maybeSingle();
  return data ? toTask(data as unknown as TaskRow) : null;
}

// Люди с доступом к странице — кого можно назначить (RPC get_page_people).
export async function fetchPagePeople(supabase: Client, pageId: string): Promise<PagePerson[]> {
  const { data } = await supabase.rpc("get_page_people", { p_page: pageId });
  return (data ?? []).map((p) => ({
    userId: p.user_id,
    name: personName(p),
    username: p.username,
    avatarUrl: p.avatar_url ?? null,
    position: p.position ?? null,
  }));
}

export type Author = { name: string; avatarUrl: string | null } | null;

export type TaskComment = {
  id: string;
  authorId: string | null;
  author: Author;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
};

export type TaskEvent = {
  id: number;
  actorId: string | null;
  actor: Author;
  kind: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type ProfileJoin = { first_name: string; last_name: string; username: string; avatar_url: string | null } | null;
const author = (p: ProfileJoin): Author => (p ? { name: personName(p), avatarUrl: p.avatar_url } : null);

export async function fetchComments(supabase: Client, taskId: string): Promise<TaskComment[]> {
  const { data } = await supabase
    .from("task_comments")
    .select("id, author_id, body, created_at, edited_at, deleted_at, profiles(first_name, last_name, username, avatar_url)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((c) => ({
    id: c.id,
    authorId: c.author_id,
    author: author(c.profiles as ProfileJoin),
    body: c.body,
    createdAt: c.created_at,
    editedAt: c.edited_at,
    deletedAt: c.deleted_at,
  }));
}

export async function fetchEvents(supabase: Client, taskId: string): Promise<TaskEvent[]> {
  const { data } = await supabase
    .from("task_events")
    .select("id, actor_id, kind, details, created_at, profiles(first_name, last_name, username, avatar_url)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((e) => ({
    id: e.id,
    actorId: e.actor_id,
    actor: author(e.profiles as ProfileJoin),
    kind: e.kind,
    details: (e.details ?? {}) as Record<string, unknown>,
    createdAt: e.created_at,
  }));
}

// Имя автора задачи (он мог уже потерять доступ к странице — берём из профилей).
export async function fetchProfileName(supabase: Client, userId: string): Promise<Author> {
  const { data } = await supabase.from("profiles").select("first_name, last_name, username, avatar_url").eq("id", userId).maybeSingle();
  return author(data);
}
