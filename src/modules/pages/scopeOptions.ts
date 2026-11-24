// Что можно выбрать в «Кому доступна» (только для показа — окончательно проверяет база).
// Owner/Admin — всё. Manager — свои подразделения с вложенными и людей из них, без «Вся компания».
import { getMembers, type Member } from "@/lib/company/queries";
import { getStructure } from "@/modules/canvas/queries";
import { buildTree, subtreeIds, type UnitMemberRow, type UnitRow } from "@/modules/canvas/tree";

export type ScopeOptions = {
  units: UnitRow[];
  unitMembers: UnitMemberRow[];
  people: Member[];
  allowOrganization: boolean;
  allowedUnitIds: string[] | null; // null — без ограничений
  allowedUserIds: string[] | null;
};

export async function getScopeOptions(orgId: string, userId: string, role: string): Promise<ScopeOptions> {
  const [{ units, unitMembers }, people] = await Promise.all([getStructure(orgId), getMembers(orgId)]);
  if (role !== "manager") {
    return { units, unitMembers, people, allowOrganization: true, allowedUnitIds: null, allowedUserIds: null };
  }
  const tree = buildTree(units, unitMembers);
  const mine = new Set<string>();
  for (const m of unitMembers) if (m.user_id === userId) for (const id of subtreeIds(tree, m.unit_id)) mine.add(id);
  const users = new Set(unitMembers.filter((m) => mine.has(m.unit_id)).map((m) => m.user_id));
  return {
    units,
    unitMembers,
    people,
    allowOrganization: false,
    allowedUnitIds: [...mine],
    allowedUserIds: [...users],
  };
}
