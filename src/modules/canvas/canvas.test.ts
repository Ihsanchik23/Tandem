import { test } from "node:test";
import assert from "node:assert/strict";
import { branchColors, branchPeople, buildTree, moveTargets, pageHome, subtreeIds, treeOrder, unassignedIds, unitPath, type UnitRow } from "./tree.ts";
import { layoutTree, ROOT_ID } from "./layout.ts";
import { unitDbError, validateUnit } from "./errors.ts";

const u = (id: string, parent_id: string | null, name = id): UnitRow => ({ id, parent_id, name, address: null, head_user_id: null });
// Компания → Филиал А (Склад, Касса), Филиал Б
const units = [u("a", null, "Филиал А"), u("b", null, "Филиал Б"), u("s", "a", "Склад"), u("k", "a", "Касса")];
const members = [
  { unit_id: "a", user_id: "boss" },
  { unit_id: "s", user_id: "ivan" },
  { unit_id: "k", user_id: "ivan" }, // один человек в двух отделах
  { unit_id: "k", user_id: "olga" },
  { unit_id: "b", user_id: "petr" },
];

test("дерево: без даты создания — по алфавиту, прямые сотрудники", () => {
  const tree = buildTree(units, members);
  assert.deepEqual(tree.children.get(null)!.map((x) => x.id), ["a", "b"]);
  assert.deepEqual(tree.children.get("a")!.map((x) => x.id), ["k", "s"]);
  assert.deepEqual(tree.members.get("k"), ["ivan", "olga"]);
});

test("сотрудники ветки считаются без повторов", () => {
  const tree = buildTree(units, members);
  assert.deepEqual([...branchPeople(tree, "a")].sort(), ["boss", "ivan", "olga"]);
  assert.equal(branchPeople(tree, "b").size, 1);
});

test("перенести можно куда угодно, кроме себя и своих вложенных", () => {
  const tree = buildTree(units, members);
  assert.deepEqual([...subtreeIds(tree, "a")].sort(), ["a", "k", "s"]);
  assert.deepEqual(moveTargets(tree, "a"), [null, "b"]);
  assert.deepEqual(moveTargets(tree, "s").sort(), [null, "a", "b", "k"].sort() as (string | null)[]);
  assert.equal(unitPath(tree, "s"), "Филиал А / Склад");
});

test("нераспределённые — без единого подразделения", () => {
  assert.deepEqual(unassignedIds(["boss", "ivan", "new"], members), ["new"]);
});

test("цикл в данных не вешает функции", () => {
  const tree = buildTree([u("x", "y"), u("y", "x")], []);
  assert.ok(subtreeIds(tree, "x").size <= 2);
});

test("раскладка: корень по центру, дети под родителем без наложений", () => {
  const tree = buildTree(units, members);
  const kids = (id: string) => (tree.children.get(id === ROOT_ID ? null : id) ?? []).map((x) => x.id);
  const W = 200;
  const pts = layoutTree({ children: kids, height: (id) => (id === "s" ? 300 : 100), width: W, gapX: 20, gapY: 50 });
  assert.equal(pts.get(ROOT_ID)!.x, 0); // компания — в левом верхнем углу
  assert.equal(pts.get(ROOT_ID)!.y, 0);
  assert.equal(pts.get("a")!.y, 150); // 100 + 50
  assert.equal(pts.get("s")!.y, 300); // 150 + 100 + 50
  // Филиал А — над своим первым ребёнком
  assert.equal(pts.get("a")!.x, pts.get("k")!.x);
  // соседи на одном уровне не накладываются
  assert.ok(pts.get("s")!.x - pts.get("k")!.x >= W);
  assert.ok(pts.get("b")!.x - pts.get("s")!.x >= W);
});

test("ошибки структуры переводятся в тексты", () => {
  assert.equal(unitDbError({ code: "23505", message: "duplicate key units_name_per_parent" }), "unitNameTaken");
  assert.equal(
    unitDbError({ code: "23503", message: 'update or delete on table "units" violates foreign key constraint "units_organization_id_parent_id_fkey" on table "units"' }),
    "unitHasChildren",
  );
  assert.equal(unitDbError({ code: "23503", message: 'violates foreign key constraint "page_scopes_unit_fkey"' }), "unitInUse");
  assert.equal(unitDbError({ message: "unit_cycle" }), "unitCycle");
  assert.equal(unitDbError({ message: "forbidden" }), "forbidden");
  assert.equal(validateUnit(" ", ""), "unitNameRequired");
  assert.equal(validateUnit("x".repeat(101), ""), "unitNameTooLong");
  assert.equal(validateUnit("Склад", "x".repeat(201)), "unitAddressTooLong");
  assert.equal(validateUnit("Склад", ""), null);
});

import { confirmLines, isEmptyBranch } from "./branch.ts";

test("удаление ветки: без людей и страниц — сразу, иначе только ненулевые строки", () => {
  assert.equal(isEmptyBranch({ units: 3, members: 0, unassigned: 0, pages: 0, toArchive: 0 }), true);
  assert.equal(isEmptyBranch({ units: 1, members: 1, unassigned: 0, pages: 0, toArchive: 0 }), false);
  assert.equal(isEmptyBranch({ units: 1, members: 0, unassigned: 0, pages: 1, toArchive: 0 }), false);
  assert.deepEqual(confirmLines({ units: 4, members: 7, unassigned: 7, pages: 2, toArchive: 2 }), [
    "В ветке 4 подразделения.",
    "7 сотрудников попадут в «Нераспределённые».",
    "2 страницы уйдут в архив.",
  ]);
  assert.deepEqual(confirmLines({ units: 1, members: 2, unassigned: 1, pages: 1, toArchive: 0 }), [
    "1 сотрудник попадёт в «Нераспределённые».",
  ]);
  assert.deepEqual(confirmLines({ units: 5, members: 1, unassigned: 0, pages: 0, toArchive: 0 }), ["В ветке 5 подразделений."]);
});

test("порядок по дате создания: новое — последним в ряду", () => {
  const rows = [
    { ...u("z", null, "Я-филиал"), created_at: "2026-11-01T00:00:00Z" },
    { ...u("y", null, "А-филиал"), created_at: "2026-11-02T00:00:00Z" },
  ];
  assert.deepEqual(buildTree(rows, []).children.get(null)!.map((x) => x.id), ["z", "y"]);
});

test("цвет направления: у каждого филиала свой, вложенные — цвет филиала", () => {
  const tree = buildTree(units, members);
  const colors = branchColors(tree);
  assert.deepEqual(colors.get("a"), { color: 1, nested: false });
  assert.deepEqual(colors.get("b"), { color: 2, nested: false });
  assert.deepEqual(colors.get("s"), { color: 1, nested: true });
  const many = buildTree(Array.from({ length: 7 }, (_, i) => u(`t${i}`, null, `Ф${i}`)), []);
  assert.equal(branchColors(many).get("t6")!.color, 1, "после шести цветов — по кругу");
});

test("страница стоит под первым подразделением из доступа, иначе под компанией", () => {
  const order = treeOrder(buildTree(units, members));
  assert.equal(pageHome(order, [{ kind: "unit", unit_id: "b" }, { kind: "unit", unit_id: "s" }]), "s", "Склад (в ветке А) левее Филиала Б");
  assert.equal(pageHome(order, [{ kind: "organization", unit_id: null }]), null);
  assert.equal(pageHome(order, [{ kind: "user", unit_id: null }]), null);
  assert.equal(pageHome(order, [{ kind: "unit", unit_id: "удалено" }]), null);
});

test("раскладка с карточками разной ширины: дети не наезжают друг на друга", () => {
  const kids: Record<string, string[]> = { [ROOT_ID]: ["a", "p"], a: [], p: [] };
  const w = (id: string) => (id === "p" ? 100 : 200);
  const pts = layoutTree({ children: (id) => kids[id] ?? [], height: () => 50, width: w, gapX: 20, gapY: 30 });
  const a = pts.get("a")!;
  const p = pts.get("p")!;
  assert.equal(p.x - (a.x + 200), 20, "между карточками ровно gapX");
  assert.equal(a.y, p.y);
});

test("новое подразделение сдвигает только ветки правее, левые и родитель на месте", () => {
  const W = 100;
  const before: Record<string, string[]> = { [ROOT_ID]: ["a", "b"], a: ["a1"], b: [] };
  const after: Record<string, string[]> = { [ROOT_ID]: ["a", "b"], a: ["a1", "a2"], b: [] };
  const run = (k: Record<string, string[]>) => layoutTree({ children: (id) => k[id] ?? [], height: () => 50, width: W, gapX: 20, gapY: 30 });
  const p1 = run(before);
  const p2 = run(after);
  for (const id of [ROOT_ID, "a", "a1"]) assert.deepEqual(p2.get(id), p1.get(id), `${id} не сдвинулся`);
  assert.equal(p2.get("b")!.x - p1.get("b")!.x, W + 20, "соседняя ветка справа подвинулась ровно на одну карточку");
  // Первый ребёнок встаёт под родителем и никого не двигает.
  const p3 = run({ [ROOT_ID]: ["a", "b"], a: ["a1"], b: ["b1"] });
  for (const id of [ROOT_ID, "a", "a1", "b"]) assert.deepEqual(p3.get(id), p1.get(id), `${id} не сдвинулся`);
});
