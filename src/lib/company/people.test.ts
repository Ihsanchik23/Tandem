import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTree, type UnitRow } from "../../modules/canvas/tree.ts";
import { personMatches, unitChipsByUser } from "./people.ts";

const u = (id: string, parent_id: string | null, name: string, created_at: string): UnitRow => ({ id, parent_id, name, address: null, head_user_id: null, created_at });
// Компания → Астана (Кассиры, Склад), Караганда
const units = [u("ast", null, "Астана", "1"), u("kar", null, "Караганда", "2"), u("kas", "ast", "Кассиры", "3"), u("skl", "ast", "Склад", "4")];
const unitMembers = [
  { unit_id: "kar", user_id: "ivan" },
  { unit_id: "kas", user_id: "ivan" },
  { unit_id: "skl", user_id: "olga" },
  { unit_id: "gone", user_id: "olga" }, // подразделения уже нет — не показываем
];
const tree = buildTree(units, unitMembers);

test("чипы: путь по дереву, порядок как на холсте, цвет ветки", () => {
  const chips = unitChipsByUser(tree, unitMembers);
  assert.deepEqual(
    chips.get("ivan")!.map((c) => c.label),
    ["Астана · Кассиры", "Караганда"],
  );
  assert.equal(chips.get("ivan")![0]!.color, 1);
  assert.equal(chips.get("ivan")![1]!.color, 2);
  assert.deepEqual(chips.get("olga")!.map((c) => c.label), ["Астана · Склад"]);
  assert.equal(chips.get("petr"), undefined); // не распределён
});

test("поиск: имя, должность, подразделение, несколько слов", () => {
  const ivan = { first_name: "Иван", last_name: "Петров", username: "ivan", position: "Кассир" };
  const chips = unitChipsByUser(tree, unitMembers).get("ivan")!;
  assert.ok(personMatches(ivan, chips, ""));
  assert.ok(personMatches(ivan, chips, "петров"));
  assert.ok(personMatches(ivan, chips, "@ivan"));
  assert.ok(personMatches(ivan, chips, "кассир"));
  assert.ok(personMatches(ivan, chips, "караганда"));
  assert.ok(personMatches(ivan, chips, "иван астана"));
  assert.ok(!personMatches(ivan, chips, "склад"));
  assert.ok(!personMatches(ivan, [], "астана"));
});
