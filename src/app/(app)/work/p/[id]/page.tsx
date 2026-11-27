import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { WorkPageSkeleton } from "@/components/ui/Skeletons";
import { StubPage } from "@/components/layout/StubPage";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { canManagePage } from "@/modules/pages/logic";
import { PageScreen } from "@/modules/pages/PageScreen";
import { getPage } from "@/modules/pages/queries";
import { TasksSection } from "@/modules/tasks/TasksSection";
import { ChatSection } from "@/modules/chat/ChatSection";

// Рабочая страница. Открыть можно только при доступе (page_access); иначе — понятный отказ.
// Содержимое модуля («Задачи», «Чат») защищает RLS, здесь только показ.
export default function WorkPage({ params }: PageProps<"/work/p/[id]">) {
  return (
    <Suspense fallback={<WorkPageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/work/p/[id]">["params"] }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  if (!company) redirect("/work");
  const page = await getPage(company.org.id, id, userId);
  if (!page) notFound();

  if (!page.hasAccess) {
    return (
      <StubPage title={t.pages.noAccessTitle}>
        <p className="text-base text-ink">{t.pages.noAccessText}</p>
        <Link href="/work" className="text-base font-medium text-accent underline underline-offset-4">
          {t.pages.backToList}
        </Link>
      </StubPage>
    );
  }
  const canManage = canManagePage(company.role, page.createdBy, userId);
  if (page.moduleKey === "tasks") {
    return <TasksSection page={page} canManage={canManage} orgId={company.org.id} me={userId} role={company.role} />;
  }
  if (page.moduleKey === "chat") {
    return <ChatSection page={page} canManage={canManage} me={userId} role={company.role} />;
  }
  return <PageScreen page={page} canManage={canManage} />;
}
