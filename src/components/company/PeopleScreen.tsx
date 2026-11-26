"use client";

import { useRouter } from "next/navigation";
import type { Member } from "@/lib/company/queries";
import type { UnitMemberRow, UnitRow } from "@/modules/canvas/tree";
import { PeopleList } from "./PeopleList";

type Props = {
  members: Member[];
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  canManage: boolean; // Owner/Admin
};

// «Сотрудники»: список; нажатие на человека открывает его карточку.
export function PeopleScreen({ members, units, unitMembers, canManage }: Props) {
  const router = useRouter();
  return (
    <PeopleList
      members={members}
      units={units}
      unitMembers={unitMembers}
      showUnassigned={canManage}
      onOpen={(id) => router.push(`/work/people/${id}`)}
    />
  );
}
