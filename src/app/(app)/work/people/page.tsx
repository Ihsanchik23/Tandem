import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { RowsSkeleton } from "@/components/ui/Skeletons";
import { InvitePanel } from "@/components/company/InvitePanel";
import { PeopleScreen } from "@/components/company/PeopleScreen";
import { getUserId } from "@/lib/auth/session";
import { canManageInvites } from "@/lib/company/permissions";
import { getActiveInvites, getMembers, getMyCompany, getSeats } from "@/lib/company/queries";
import { t } from "@/lib/i18n";
import { getStructure } from "@/modules/canvas/queries";

// «Моя компания → Сотрудники». Видят все сотрудники компании (ТЗ, раздел 6).
export default function PeoplePage() {
  return (
    <StubPage title={t.company.peopleTitle}>
      <Suspense fallback={<RowsSkeleton rows={6} />}>
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
  const canManage = canManageInvites(company.role);
  const [members, structure, invites, seats] = await Promise.all([
    getMembers(orgId),
    getStructure(orgId),
    canManage ? getActiveInvites(orgId) : Promise.resolve([]),
    company.role === "owner" ? getSeats(orgId) : Promise.resolve(null),
  ]);
  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <InvitePanel
          organizationId={orgId}
          organizationName={company.org.name}
          invites={invites}
          seats={seats !== null ? { used: members.length, total: seats } : null}
        />
      ) : null}
      {/* «Нераспределённые» видят только Owner и Admin — те, кто распределяет людей по подразделениям. */}
      <PeopleScreen members={members} units={structure.units} unitMembers={structure.unitMembers} canManage={canManage} />
    </div>
  );
}
