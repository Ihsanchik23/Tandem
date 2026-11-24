import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { FormFallback } from "@/components/auth/FormFallback";
import { ConfirmAction } from "@/components/ui/ConfirmAction";
import { PositionForm, RoleForm } from "@/components/company/MemberForms";
import { Avatar } from "@/components/profile/Avatar";
import { getUserId } from "@/lib/auth/session";
import { removeMember } from "@/lib/company/actions";
import { canEditPosition, canManageMember, roleOptions } from "@/lib/company/permissions";
import { getMember, getMyCompany } from "@/lib/company/queries";
import { format, t } from "@/lib/i18n";

// Карточка сотрудника: должность, роль, удаление — для тех, кому это разрешено.
// Кнопки скрываются по ролям, но проверяют права функции базы.
export default function MemberPage({ params }: PageProps<"/work/people/[userId]">) {
  return (
    <StubPage title={t.company.memberTitle}>
      <Suspense fallback={<FormFallback />}>
        <MemberContent params={params} />
      </Suspense>
    </StubPage>
  );
}

async function MemberContent({ params }: { params: PageProps<"/work/people/[userId]">["params"] }) {
  const { userId: targetId } = await params;
  const myId = await getUserId();
  if (!myId) redirect("/login");
  const company = await getMyCompany(myId);
  if (!company) redirect("/work");

  const m = await getMember(company.org.id, targetId);
  if (!m) notFound();

  const c = t.company;
  const name = `${m.first_name} ${m.last_name}`.trim();
  const isSelf = m.user_id === myId;
  const ids = { organizationId: company.org.id, userId: m.user_id };
  const manage = canManageMember(company.role, m.role, isSelf);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar url={m.avatar_url} name={name} size={64} />
        <div className="min-w-0">
          <p className="truncate text-lg font-medium text-neutral-900">{name}</p>
          <p className="truncate text-base text-neutral-600">
            {[m.position, c.roles[m.role]].filter(Boolean).join(" · ")}
          </p>
          <Link href={`/@${m.username}`} className="text-sm font-medium text-neutral-900 underline underline-offset-4">
            {c.openProfile}
          </Link>
        </div>
      </div>

      {canEditPosition(company.role) ? <PositionForm {...ids} position={m.position} /> : null}
      {manage ? <RoleForm {...ids} role={m.role} options={roleOptions(company.role)} /> : null}
      {manage ? (
        <ConfirmAction
          action={removeMember}
          fields={{ organization_id: ids.organizationId, user_id: ids.userId }}
          label={c.remove}
          confirmText={format(c.removeConfirm, { name })}
          yesLabel={c.removeYes}
          pendingLabel={c.removing}
        />
      ) : null}

      <Link href="/work/people" className="text-base font-medium text-neutral-900 underline underline-offset-4">
        {c.peopleTitle}
      </Link>
    </div>
  );
}
