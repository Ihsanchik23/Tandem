// Кому доступна рабочая страница и почему — для показа в карточке сотрудника и в настройках страницы.
// Повторяет правила базы (recompute_page_access): Owner/Admin — все страницы; «вся компания» — все;
// подразделение — его сотрудники и сотрудники всех вложенных; «человек» — он сам.
// Это только объяснение на экране: настоящий доступ считает и проверяет база.
import { subtreeIds, type Tree } from "../../modules/canvas/tree.ts";

export type ScopeLite = { kind: "organization" | "unit" | "user"; unit_id: string | null; user_id: string | null };
export type AccessReason = { kind: "role" } | { kind: "organization" } | { kind: "unit"; unitId: string } | { kind: "user" };
export type MemberLite = { user_id: string; role: string };

const seesAll = (role: string) => role === "owner" || role === "admin";

// Подразделения, где человек состоит напрямую.
export function unitsOfUser(tree: Tree, userId: string): Set<string> {
  const result = new Set<string>();
  for (const [unitId, ids] of tree.members) if (ids.includes(userId)) result.add(unitId);
  return result;
}

// Почему у человека есть доступ к странице; пусто — доступа нет.
export function accessReasons(scopes: ScopeLite[], tree: Tree, userId: string, role: string): AccessReason[] {
  if (seesAll(role)) return [{ kind: "role" }];
  const mine = unitsOfUser(tree, userId);
  const reasons: AccessReason[] = [];
  if (scopes.some((s) => s.kind === "organization")) reasons.push({ kind: "organization" });
  for (const s of scopes) {
    if (s.kind !== "unit" || !s.unit_id || !tree.byId.has(s.unit_id)) continue;
    const branch = subtreeIds(tree, s.unit_id);
    if ([...mine].some((id) => branch.has(id))) reasons.push({ kind: "unit", unitId: s.unit_id });
  }
  if (scopes.some((s) => s.kind === "user" && s.user_id === userId)) reasons.push({ kind: "user" });
  return reasons;
}

// Есть ли у человека индивидуальный доступ (его можно забрать) — и есть ли доступ помимо него.
export function hasOnlyIndividual(reasons: AccessReason[]): boolean {
  return reasons.length === 1 && reasons[0]!.kind === "user";
}

// Все, у кого есть доступ при таком Scope.
export function accessHolders(scopes: ScopeLite[], tree: Tree, members: MemberLite[]): Set<string> {
  return new Set(members.filter((m) => accessReasons(scopes, tree, m.user_id, m.role).length > 0).map((m) => m.user_id));
}

// Что изменится при смене Scope: кто получит доступ и кто его потеряет (Owner/Admin не меняются никогда).
export function accessDiff(before: ScopeLite[], after: ScopeLite[], tree: Tree, members: MemberLite[]): { gain: string[]; lose: string[] } {
  const was = accessHolders(before, tree, members);
  const will = accessHolders(after, tree, members);
  return {
    gain: members.filter((m) => will.has(m.user_id) && !was.has(m.user_id)).map((m) => m.user_id),
    lose: members.filter((m) => was.has(m.user_id) && !will.has(m.user_id)).map((m) => m.user_id),
  };
}
