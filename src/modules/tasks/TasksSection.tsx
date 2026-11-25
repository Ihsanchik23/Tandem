// Страница модуля «Задачи»: шапка и доска. Первый экран читаем на сервере,
// дальше — в браузере (Realtime).
import { createClient } from "@/lib/supabase/server";
import { PageScreen } from "@/modules/pages/PageScreen";
import type { PageRow } from "@/modules/pages/queries";
import { fetchPagePeople, fetchPageTasks } from "./data";
import type { TaskRole } from "./logic";
import { TasksBoard } from "./TasksBoard";

export async function TasksSection({
  page,
  canManage,
  orgId,
  me,
  role,
}: {
  page: PageRow;
  canManage: boolean;
  orgId: string;
  me: string;
  role: TaskRole | null;
}) {
  const supabase = await createClient();
  const [tasks, people, { data: orgActive }] = await Promise.all([
    fetchPageTasks(supabase, page.id),
    fetchPagePeople(supabase, page.id),
    supabase.rpc("org_is_active", { p_org: orgId }),
  ]);
  // Страница в архиве или подписка истекла — только просмотр (база всё равно не даст изменить).
  const readOnly = page.archived || orgActive !== true;
  return (
    <PageScreen page={page} canManage={canManage} wide>
      <TasksBoard pageId={page.id} me={me} role={role} readOnly={readOnly} initialTasks={tasks ?? []} people={people} />
    </PageScreen>
  );
}
