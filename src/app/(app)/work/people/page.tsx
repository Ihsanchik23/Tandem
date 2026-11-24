import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormFallback } from "@/components/auth/FormFallback";
import { PeopleList } from "@/components/company/PeopleList";
import { getUserId } from "@/lib/auth/session";
import { getAssignedUserIds, getMembers, getMyCompany } from "@/lib/company/queries";
import { t } from "@/lib/i18n";

// «Моя компания → Сотрудники». Видят все сотрудники компании (ТЗ, раздел 6).
export default function PeoplePage() {
  return (
    <StubPage title={t.company.peopleTitle}>
      <Suspense fallback={<FormFallback />}>
        <PeopleContent />
      </Suspense>
    </StubPage>
  );
}

async function PeopleContent() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const company = await getMyCompany(userId);
  if (!company) redirect("/work");

  const [members, assigned] = await Promise.all([
    getMembers(company.org.id),
    getAssignedUserIds(company.org.id),
  ]);
  const unassignedIds = members.filter((m) => !assigned.has(m.user_id)).map((m) => m.user_id);
  return <PeopleList members={members} unassignedIds={unassignedIds} />;
}
