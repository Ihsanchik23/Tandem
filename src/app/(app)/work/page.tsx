import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormFallback } from "@/components/auth/FormFallback";
import { NoCompany, WorkHome } from "@/components/company/WorkHome";
import { FormMessage } from "@/components/ui/FormMessage";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany, hasFreeSubscription } from "@/lib/company/queries";
import { t } from "@/lib/i18n";

// «Работа». Сюда попадают при обычном входе и после создания компании.
export default function WorkPage({ searchParams }: PageProps<"/work">) {
  return (
    <StubPage title={t.work.title}>
      <Suspense fallback={null}>
        <Notice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<FormFallback />}>
        <WorkContent />
      </Suspense>
    </StubPage>
  );
}

async function WorkContent() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  if (company) return <WorkHome company={company} />;
  return <NoCompany canCreate={await hasFreeSubscription(userId)} />;
}

async function Notice({ searchParams }: { searchParams: PageProps<"/work">["searchParams"] }) {
  const { notice } = await searchParams;
  if (notice !== "passwordChanged") return null;
  return <FormMessage kind="notice">{t.auth.notices.passwordChanged}</FormMessage>;
}
