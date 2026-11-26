import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTree, type UnitRow } from "../../modules/canvas/tree.ts";
import { accessDiff, accessHolders, accessReasons, hasOnlyIndividual, type ScopeLite } from "./access.ts";

const u = (id: string, parent_id: string | null, name: string): UnitRow => ({ id, parent_id, name, address: null, head_user_id: null });
// Компания → Астана (Кассиры), Караганда
const units = [u("ast", null, "Астана"), u("kas", "ast", "Кассиры"), u("kar", null, "Караганда")];
const tree = buildTree(units, [
  { unit_id: "kas", user_id: "ivan" },
  { unit_id: "kar", user_id: "olga" },
]);
const members = [
  { user_id: "boss", role: "owner" },
  { user_id: "adm", role: "admin" },
  { user_id: "ivan", role: "employee" },
  { user_id: "olga", role: "employee" },
  { user_id: "petr", role: "manager" }, // не распределён
];
const unit = (id: string): ScopeLite => ({ kind: "unit", unit_id: id, user_id: null });
const user = (id: string): ScopeLite => ({ kind: "user", unit_id: null, user_id: id });
const org: ScopeLite = { kind: "organization", unit_id: null, user_id: null };

test("причины доступа: роль, вся компания, подразделение сверху вниз, индивидуально", () => {
  assert.deepEqual(accessReasons([unit("kar")], tree, "adm", "admin"), [{ kind: "role" }]);
  assert.deepEqual(accessReasons([org], tree, "petr", "manager"), [{ kind: "organization" }]);
  // Страница Астаны доступна сотруднику вложенных «Кассиров».
  assert.deepEqual(accessReasons([unit("ast")], tree, "ivan", "employee"), [{ kind: "unit", unitId: "ast" }]);
  // Вверх доступ не наследуется.
  assert.deepEqual(accessReasons([unit("kas")], tree, "olga", "employee"), []);
  assert.deepEqual(accessReasons([unit("ast"), user("ivan")], tree, "ivan", "employee"), [{ kind: "unit", unitId: "ast" }, { kind: "user" }]);
  assert.ok(hasOnlyIndividual(accessReasons([unit("kar"), user("ivan")], tree, "ivan", "employee")));
  assert.ok(!hasOnlyIndividual(accessReasons([unit("ast"), user("ivan")], tree, "ivan", "employee")));
});

test("кто видит страницу и что изменится при смене доступа", () => {
  assert.deepEqual([...accessHolders([unit("ast")], tree, members)].sort(), ["adm", "boss", "ivan"]);
  const diff = accessDiff([unit("ast"), user("petr")], [unit("kar"), user("ivan")], tree, members);
  assert.deepEqual(diff, { gain: ["olga"], lose: ["petr"] }); // ivan остался (теперь индивидуально)
  assert.deepEqual(accessDiff([unit("kar")], [org], tree, members), { gain: ["ivan", "petr"], lose: [] });
});
