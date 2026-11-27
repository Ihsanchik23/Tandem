import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormFallback } from "@/components/auth/FormFallback";
import { StubPage } from "@/components/layout/StubPage";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { PagesList } from "@/modules/pages/PagesList";
import { getCompanyPages } from "@/modules/pages/queries";

export const metadata: Metadata = { title: `${t.pages.archiveTitle} — ${t.app.name}` };

// «Прочее → Архив»: рабочие страницы в архиве, к которым у меня есть доступ.
// Раньше это была вкладка на «Работе»; права те же — список отдаёт база (RLS + page_access).
export default function ArchivePage() {
  return (
    <StubPage title={t.pages.archiveTitle} wide>
      <Suspense fallback={<FormFallback />}>
        <ArchiveContent />
      </Suspense>
    </StubPage>
  );
}

async function ArchiveContent() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  if (!company) redirect("/work");
  const pages = (await getCompanyPages(company.org.id, userId)).filter((p) => p.hasAccess && p.archived);
  return (
    <>
      <p className="text-sm text-muted">{t.pages.archiveIntro}</p>
      <PagesList pages={pages} canCreate={false} archive />
    </>
  );
}
