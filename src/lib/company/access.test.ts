import { test } from "node:test";
import assert from "node:assert/strict";
import { ancestorIds, buildTree, type UnitRow } from "../../modules/canvas/tree.ts";
import { accessDiff, accessHolders, accessReasons, hasOnlyIndividual, type ScopeLite } from "./access.ts";

const u = (id: string, parent_id: string | null, name: string): UnitRow => ({ id, parent_id, name, address: null, head_user_id: null });
// Компания → Семей (Точка 1 → Касса, Точка 2), Астана. По сотруднику в каждом.
const units = [u("sem", null, "Семей"), u("t1", "sem", "Точка 1"), u("t2", "sem", "Точка 2"), u("kas", "t1", "Касса"), u("ast", null, "Астана")];
const tree = buildTree(units, [
  { unit_id: "sem", user_id: "dir" },
  { unit_id: "t1", user_id: "ivan" },
  { unit_id: "t2", user_id: "olga" },
  { unit_id: "kas", user_id: "kira" },
  { unit_id: "ast", user_id: "aset" },
]);
const members = [
  { user_id: "boss", role: "owner" },
  { user_id: "adm", role: "admin" },
  { user_id: "dir", role: "employee" },
  { user_id: "ivan", role: "employee" },
  { user_id: "olga", role: "employee" },
  { user_id: "kira", role: "employee" },
  { user_id: "aset", role: "employee" },
  { user_id: "petr", role: "manager" }, // не распределён
];
const unit = (id: string): ScopeLite => ({ kind: "unit", unit_id: id, user_id: null });
const user = (id: string): ScopeLite => ({ kind: "user", unit_id: null, user_id: id });
const org: ScopeLite = { kind: "organization", unit_id: null, user_id: null };
const holders = (scopes: ScopeLite[]) => [...accessHolders(scopes, tree, members)].sort();

test("предки подразделения — до корня", () => {
  assert.deepEqual(ancestorIds(tree, "kas"), ["t1", "sem"]);
  assert.deepEqual(ancestorIds(tree, "sem"), []);
});

test("страница подразделения: вниз и вверх по дереву, соседним веткам — нет", () => {
  // Страница Семея — Семей, Точка 1, Точка 2, Касса.
  assert.deepEqual(holders([unit("sem")]), ["adm", "boss", "dir", "ivan", "kira", "olga"]);
  // Страница Точки 1 — Точка 1, Касса и родитель Семей; Точка 2 и Астана — нет.
  assert.deepEqual(holders([unit("t1")]), ["adm", "boss", "dir", "ivan", "kira"]);
  // Страница Кассы — вверх до корня: Точка 1 и Семей.
  assert.deepEqual(holders([unit("kas")]), ["adm", "boss", "dir", "ivan", "kira"]);
  // Отдельная ветка Астана.
  assert.deepEqual(holders([unit("ast")]), ["adm", "aset", "boss"]);
});

test("причины: подразделение, дочернее подразделение, роль, вся компания, индивидуально", () => {
  assert.deepEqual(accessReasons([unit("t1")], tree, "adm", "admin"), [{ kind: "role" }]);
  assert.deepEqual(accessReasons([org], tree, "petr", "manager"), [{ kind: "organization" }]);
  // Сотрудник точки видит страницу своего филиала — «через подразделение Семей».
  assert.deepEqual(accessReasons([unit("sem")], tree, "ivan", "employee"), [{ kind: "unit", unitId: "sem", child: false }]);
  // Сотрудник филиала видит страницу точки — «через дочернее подразделение Точка 1».
  assert.deepEqual(accessReasons([unit("t1")], tree, "dir", "employee"), [{ kind: "unit", unitId: "t1", child: true }]);
  // Соседняя точка — нет.
  assert.deepEqual(accessReasons([unit("t1")], tree, "olga", "employee"), []);
  assert.deepEqual(accessReasons([unit("sem"), user("ivan")], tree, "ivan", "employee"), [{ kind: "unit", unitId: "sem", child: false }, { kind: "user" }]);
  assert.ok(hasOnlyIndividual(accessReasons([unit("ast"), user("ivan")], tree, "ivan", "employee")));
  assert.ok(!hasOnlyIndividual(accessReasons([unit("sem"), user("ivan")], tree, "ivan", "employee")));
});

test("кто получит и кто потеряет доступ — по новому правилу", () => {
  // Точка 2 → Точка 1: Ольга теряет, Иван и Кира получают; директор Семея видит обе — без изменений.
  assert.deepEqual(accessDiff([unit("t2")], [unit("t1")], tree, members), { gain: ["ivan", "kira"], lose: ["olga"] });
  // Точка 1 → вся компания: получают все, кто ещё не видел.
  assert.deepEqual(accessDiff([unit("t1")], [org], tree, members), { gain: ["olga", "aset", "petr"], lose: [] });
  // Индивидуальный доступ убрали, но человек видит через подразделение — никто не теряет.
  assert.deepEqual(accessDiff([unit("t1"), user("dir")], [unit("t1")], tree, members), { gain: [], lose: [] });
});
