import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormFallback } from "@/components/auth/FormFallback";
import { CompanyForm } from "@/components/company/CompanyForm";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany, hasFreeSubscription } from "@/lib/company/queries";
import { t } from "@/lib/i18n";

// Создание компании (ТЗ, раздел 9). Окончательно всё проверяет create_organization.
export default function NewCompanyPage() {
  return (
    <StubPage title={t.company.createTitle}>
      <Suspense fallback={<FormFallback />}>
        <NewCompanyContent />
      </Suspense>
    </StubPage>
  );
}

async function NewCompanyContent() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (await getMyCompany(userId)) redirect("/work");

  if (!(await hasFreeSubscription(userId))) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-base text-neutral-600">{t.work.needSubscription}</p>
        <Link href="/work" className="text-base font-medium text-accent underline underline-offset-4">
          {t.company.cancel}
        </Link>
      </div>
    );
  }
  return <CompanyForm mode="create" cancelHref="/work" />;
}
