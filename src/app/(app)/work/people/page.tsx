import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormFallback } from "@/components/auth/FormFallback";
import { InvitePanel } from "@/components/company/InvitePanel";
import { PeopleList } from "@/components/company/PeopleList";
import { getUserId } from "@/lib/auth/session";
import { canManageInvites } from "@/lib/company/permissions";
import { getActiveInvites, getAssignedUserIds, getMembers, getMyCompany, getSeats } from "@/lib/company/queries";
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

  const orgId = company.org.id;
  const canInvite = canManageInvites(company.role);
  const [members, assigned, invites, seats] = await Promise.all([
    getMembers(orgId),
    getAssignedUserIds(orgId),
    canInvite ? getActiveInvites(orgId) : Promise.resolve([]),
    company.role === "owner" ? getSeats(orgId) : Promise.resolve(null),
  ]);
  const unassignedIds = members.filter((m) => !assigned.has(m.user_id)).map((m) => m.user_id);
  return (
    <div className="flex flex-col gap-6">
      {canInvite ? (
        <InvitePanel
          organizationId={orgId}
          organizationName={company.org.name}
          invites={invites}
          seats={seats !== null ? { used: members.length, total: seats } : null}
        />
      ) : null}
      <PeopleList members={members} unassignedIds={unassignedIds} />
    </div>
  );
}
