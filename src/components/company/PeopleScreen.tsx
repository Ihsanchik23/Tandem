"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Member } from "@/lib/company/queries";
import type { Role } from "@/lib/company/permissions";
import { buildTree, type UnitMemberRow, type UnitRow } from "@/modules/canvas/tree";
import { MemberSheet, type PageInfo } from "./MemberSheet";
import { PeopleList } from "./PeopleList";

type Props = {
  organizationId: string;
  members: Member[];
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  pages: PageInfo[];
  me: string;
  myRole: Role;
};

// «Сотрудники»: список, а поверх него — карточка сотрудника справа.
// Карточка открывается сменой адреса (?member=<id>) без запроса к серверу — как карточка задачи:
// список не перерисовывается, панель плавно выезжает, ссылкой можно поделиться.
// После любого изменения сервер присылает свежие данные — список и панель обновляются сами.
export function PeopleScreen({ organizationId, members, units, unitMembers, pages, me, myRole }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const memberId = params.get("member");
  // Содержимое панели не пропадает, пока она плавно уезжает.
  const [shownId, setShownId] = useState<string | null>(memberId);
  if (memberId && memberId !== shownId) setShownId(memberId);

  const tree = useMemo(() => buildTree(units, unitMembers), [units, unitMembers]);
  const member = shownId ? (members.find((m) => m.user_id === shownId) ?? null) : null;
  const canManage = myRole === "owner" || myRole === "admin";

  const open = useCallback((id: string) => window.history.pushState(null, "", `${pathname}?member=${id}`), [pathname]);
  const close = useCallback(() => window.history.replaceState(null, "", pathname), [pathname]);

  return (
    <>
      <PeopleList
        members={members}
        units={units}
        unitMembers={unitMembers}
        showUnassigned={canManage}
        activeId={memberId}
        onOpen={open}
      />
      <MemberSheet
        open={memberId !== null}
        member={member}
        tree={tree}
        pages={pages}
        organizationId={organizationId}
        me={me}
        myRole={myRole}
        onClose={close}
      />
    </>
  );
}
