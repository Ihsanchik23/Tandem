import { test } from "node:test";
import assert from "node:assert/strict";
import { branchPeople, buildTree, moveTargets, subtreeIds, unassignedIds, unitPath, type UnitRow } from "./tree.ts";
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

test("дерево: дети по алфавиту, прямые сотрудники", () => {
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
  assert.equal(pts.get(ROOT_ID)!.x, -W / 2); // центр корня в x = 0
  assert.equal(pts.get(ROOT_ID)!.y, 0);
  assert.equal(pts.get("a")!.y, 150); // 100 + 50
  assert.equal(pts.get("s")!.y, 300); // 150 + 100 + 50
  // Филиал А по центру над своими детьми
  const center = (id: string) => pts.get(id)!.x + W / 2;
  assert.equal(center("a"), (center("k") + center("s")) / 2);
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
