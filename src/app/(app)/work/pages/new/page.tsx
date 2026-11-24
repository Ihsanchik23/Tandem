import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormFallback } from "@/components/auth/FormFallback";
import { StubPage } from "@/components/layout/StubPage";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { canCreatePage, EMPTY_SELECTION, type ScopeSelection } from "@/modules/pages/logic";
import { PageForm } from "@/modules/pages/PageForm";
import { getScopeOptions } from "@/modules/pages/scopeOptions";

// Создание рабочей страницы (ТЗ, раздел 11). ?unit=<id> или ?scope=organization — доступ подставлен
// (так открывается из «+» на структуре).
export default function NewPagePage({ searchParams }: PageProps<"/work/pages/new">) {
  return (
    <StubPage title={t.pages.createTitle}>
      <Suspense fallback={<FormFallback />}>
        <NewPageContent searchParams={searchParams} />
      </Suspense>
    </StubPage>
  );
}

async function NewPageContent({ searchParams }: { searchParams: PageProps<"/work/pages/new">["searchParams"] }) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  if (!company) redirect("/work");
  if (!canCreatePage(company.role)) redirect("/work");

  const [{ unit, scope }, options] = await Promise.all([searchParams, getScopeOptions(company.org.id, userId, company.role)]);
  let initial: ScopeSelection = options.allowOrganization ? { ...EMPTY_SELECTION, organization: true } : EMPTY_SELECTION;
  if (typeof unit === "string" && options.units.some((u) => u.id === unit)) initial = { ...EMPTY_SELECTION, units: [unit] };
  else if (scope === "organization" && options.allowOrganization) initial = { ...EMPTY_SELECTION, organization: true };

  return <PageForm mode="create" organizationId={company.org.id} options={options} initialSelection={initial} />;
}
