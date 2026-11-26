// Список сотрудников: где человек состоит и поиск. Чистые функции без сервера — покрыты тестами.
import { branchColors, treeOrder, unitPath, type Tree, type UnitMemberRow } from "../../modules/canvas/tree.ts";

// Чип подразделения: путь по дереву («Астана · Кассиры») и цвет направления (1..6, null — без цвета).
export type UnitChip = { unitId: string; label: string; color: number | null };

// Подразделения каждого сотрудника — в порядке дерева (как на холсте).
export function unitChipsByUser(tree: Tree, unitMembers: UnitMemberRow[]): Map<string, UnitChip[]> {
  const order = treeOrder(tree);
  const colors = branchColors(tree);
  const result = new Map<string, UnitChip[]>();
  for (const m of unitMembers) {
    if (!tree.byId.has(m.unit_id)) continue;
    const list = result.get(m.user_id) ?? [];
    if (list.some((c) => c.unitId === m.unit_id)) continue;
    list.push({ unitId: m.unit_id, label: unitPath(tree, m.unit_id, " · "), color: colors.get(m.unit_id)?.color ?? null });
    result.set(m.user_id, list);
  }
  for (const list of result.values()) list.sort((a, b) => (order.get(a.unitId) ?? 0) - (order.get(b.unitId) ?? 0));
  return result;
}

export type PersonLike = { first_name: string; last_name: string; username: string; position: string | null };

// Поиск по имени, @username, должности и подразделению; каждое слово запроса должно найтись.
export function personMatches(m: PersonLike, chips: UnitChip[], query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  if (!q) return true;
  const hay = [m.first_name, m.last_name, m.username, m.position ?? "", ...chips.map((c) => c.label)].join(" ").toLowerCase();
  return q.split(/\s+/).every((part) => hay.includes(part));
}

export const fullName = (m: { first_name: string; last_name: string; username?: string }) =>
  `${m.first_name} ${m.last_name}`.trim() || (m.username ? `@${m.username}` : "");
