// Дерево подразделений (ТЗ, раздел 10). Чистые функции без сервера — покрыты тестами.
export type UnitRow = {
  id: string;
  parent_id: string | null;
  name: string;
  address: string | null;
  head_user_id: string | null;
  created_at?: string; // порядок на холсте: новое — последним в ряду, соседи не перемешиваются
};
export type UnitMemberRow = { unit_id: string; user_id: string };

export type Tree = {
  byId: Map<string, UnitRow>;
  children: Map<string | null, UnitRow[]>; // null — верхний уровень (под компанией)
  members: Map<string, string[]>; // прямые сотрудники подразделения
};

// Сначала созданные раньше; без даты (старые данные) — по названию.
function byCreated(a: UnitRow, b: UnitRow): number {
  return (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.name.localeCompare(b.name, "ru");
}

export function buildTree(units: UnitRow[], unitMembers: UnitMemberRow[]): Tree {
  const byId = new Map(units.map((u) => [u.id, u]));
  const children = new Map<string | null, UnitRow[]>();
  for (const u of units) {
    // Родитель не найден (не должно случаться) — показываем на верхнем уровне, а не теряем.
    const parent = u.parent_id && byId.has(u.parent_id) ? u.parent_id : null;
    const list = children.get(parent) ?? [];
    list.push(u);
    children.set(parent, list);
  }
  for (const list of children.values()) list.sort(byCreated);

  const members = new Map<string, string[]>();
  for (const m of unitMembers) {
    if (!byId.has(m.unit_id)) continue;
    const list = members.get(m.unit_id) ?? [];
    list.push(m.user_id);
    members.set(m.unit_id, list);
  }
  return { byId, children, members };
}

// Само подразделение и все вложенные (на любую глубину).
export function subtreeIds(tree: Tree, unitId: string): Set<string> {
  const seen = new Set<string>();
  const stack = [unitId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue; // защита от цикла в данных
    seen.add(id);
    for (const c of tree.children.get(id) ?? []) stack.push(c.id);
  }
  return seen;
}

// Уникальные сотрудники всей ветки: человек в двух вложенных отделах считается один раз.
export function branchPeople(tree: Tree, unitId: string): Set<string> {
  const people = new Set<string>();
  for (const id of subtreeIds(tree, unitId)) for (const u of tree.members.get(id) ?? []) people.add(u);
  return people;
}

// Куда можно перенести подразделение: никуда внутрь себя. null — верхний уровень.
export function moveTargets(tree: Tree, unitId: string): (string | null)[] {
  const blocked = subtreeIds(tree, unitId);
  const result: (string | null)[] = [null];
  for (const u of tree.byId.values()) if (!blocked.has(u.id)) result.push(u.id);
  return result;
}

// Путь для подписи: «Филиал 1 / Склад» (в чипах сотрудников — «Астана · Кассиры»).
export function unitPath(tree: Tree, unitId: string, sep = " / "): string {
  const names: string[] = [];
  const seen = new Set<string>();
  let cur = tree.byId.get(unitId);
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    names.unshift(cur.name);
    cur = cur.parent_id ? tree.byId.get(cur.parent_id) : undefined;
  }
  return names.join(sep);
}

// Сотрудники компании без подразделения.
export function unassignedIds(allUserIds: string[], unitMembers: UnitMemberRow[]): string[] {
  const assigned = new Set(unitMembers.map((m) => m.user_id));
  return allUserIds.filter((id) => !assigned.has(id));
}

// ---------- Цвета направлений ----------
export const BRANCH_COLORS = 6;
export type BranchColor = { color: number; nested: boolean }; // color — 1..6 (переменные --branch-N-* в globals.css)

// Каждый филиал верхнего уровня получает свой цвет по порядку; вложенные — цвет своего филиала.
export function branchColors(tree: Tree): Map<string, BranchColor> {
  const result = new Map<string, BranchColor>();
  (tree.children.get(null) ?? []).forEach((top, i) => {
    const color = (i % BRANCH_COLORS) + 1;
    for (const id of subtreeIds(tree, top.id)) result.set(id, { color, nested: id !== top.id });
  });
  return result;
}

// ---------- Где стоит карточка страницы ----------
export type ScopeLite = { kind: "organization" | "unit" | "user"; unit_id: string | null };

// Порядок подразделений «сверху вниз, слева направо», как их рисует холст.
export function treeOrder(tree: Tree): Map<string, number> {
  const order = new Map<string, number>();
  const visit = (parent: string | null) => {
    for (const u of tree.children.get(parent) ?? []) {
      if (order.has(u.id)) continue;
      order.set(u.id, order.size);
      visit(u.id);
    }
  };
  visit(null);
  return order;
}

// Страница встаёт под первым подразделением из своего доступа; «вся компания» или только люди — под компанией (null).
export function pageHome(order: Map<string, number>, scopes: ScopeLite[]): string | null {
  if (scopes.some((s) => s.kind === "organization")) return null;
  let best: string | null = null;
  for (const s of scopes) {
    if (s.kind !== "unit" || !s.unit_id || !order.has(s.unit_id)) continue;
    if (best === null || order.get(s.unit_id)! < order.get(best)!) best = s.unit_id;
  }
  return best;
}
