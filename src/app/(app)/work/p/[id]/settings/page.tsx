import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { FormFallback } from "@/components/auth/FormFallback";
import { StubPage } from "@/components/layout/StubPage";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { archivePage } from "@/modules/pages/actions";
import { RestoreButton } from "@/modules/pages/RestoreButton";
import { AccessForm } from "@/modules/pages/AccessForm";
import { canManagePage, fromScopes } from "@/modules/pages/logic";
import { PageForm } from "@/modules/pages/PageForm";
import { getPage } from "@/modules/pages/queries";
import { getScopeOptions } from "@/modules/pages/scopeOptions";

// Настройки страницы: название и описание, доступ (через структуру и индивидуальный, с подтверждением), архив.
// Кнопки видны тем, кому разрешено; окончательно права проверяют функции базы.
export default function PageSettings({ params }: PageProps<"/work/p/[id]/settings">) {
  return (
    <StubPage title={t.pages.settings}>
      <Suspense fallback={<FormFallback />}>
        <Content params={params} />
      </Suspense>
    </StubPage>
  );
}

async function Content({ params }: { params: PageProps<"/work/p/[id]/settings">["params"] }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  if (!company) redirect("/work");
  const page = await getPage(company.org.id, id, userId);
  if (!page) notFound();
  if (!canManagePage(company.role, page.createdBy, userId)) redirect(`/work/p/${id}`);

  const options = await getScopeOptions(company.org.id, userId, company.role);
  const p = t.pages;
  return (
    <div className="flex flex-col gap-8">
      <PageForm pageId={page.id} initial={{ name: page.name, description: page.description ?? "" }} />
      <AccessForm pageId={page.id} options={options} initial={fromScopes(page.scopes)} />
      {page.archived ? (
        <RestoreButton pageId={page.id} />
      ) : (
        <ConfirmAction
          action={archivePage}
          fields={{ page_id: page.id }}
          label={p.archive}
          confirmText={p.archiveConfirm}
          yesLabel={p.archiveYes}
          pendingLabel={p.archiving}
        />
      )}
    </div>
  );
}
