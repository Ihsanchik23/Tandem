// Содержимое страницы модуля «Задачи»: первый экран читаем на сервере, дальше — в браузере (Realtime).
import { createClient } from "@/lib/supabase/server";
import { fetchPagePeople, fetchPageTasks } from "./data";
import type { TaskRole } from "./logic";
import { TasksBoard } from "./TasksBoard";

export async function TasksSection({
  pageId,
  orgId,
  me,
  role,
  pageArchived,
}: {
  pageId: string;
  orgId: string;
  me: string;
  role: TaskRole | null;
  pageArchived: boolean;
}) {
  const supabase = await createClient();
  const [tasks, people, { data: orgActive }] = await Promise.all([
    fetchPageTasks(supabase, pageId),
    fetchPagePeople(supabase, pageId),
    supabase.rpc("org_is_active", { p_org: orgId }),
  ]);
  // Страница в архиве или подписка истекла — только просмотр (база всё равно не даст изменить).
  const readOnly = pageArchived || orgActive !== true;
  return <TasksBoard pageId={pageId} me={me} role={role} readOnly={readOnly} initialTasks={tasks ?? []} people={people} />;
}
