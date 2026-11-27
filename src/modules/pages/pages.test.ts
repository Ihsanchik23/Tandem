import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canCreatePage, canManagePage, filterPages, fromScopes, isNewPage, pageDbError, sortPages, toScopes, validatePage,
} from "./logic.ts";

test("область доступа: выбор в форме ↔ строки базы", () => {
  assert.deepEqual(toScopes({ organization: true, units: ["a"], users: ["u"] }), [{ kind: "organization" }]);
  assert.deepEqual(toScopes({ organization: false, units: ["a", "a", "b"], users: ["u"] }), [
    { kind: "unit", unit_id: "a" }, { kind: "unit", unit_id: "b" }, { kind: "user", user_id: "u" },
  ]);
  assert.deepEqual(
    fromScopes([{ kind: "unit", unit_id: "a", user_id: null }, { kind: "user", unit_id: null, user_id: "u" }]),
    { organization: false, units: ["a"], users: ["u"] },
  );
});

test("проверка полей страницы", () => {
  const sel = { organization: true, units: [], users: [] };
  assert.deepEqual(validatePage({ name: "Задачи", description: "", selection: sel }), {});
  assert.equal(validatePage({ name: "  ", description: "", selection: sel }).name, "pageNameRequired");
  assert.equal(validatePage({ name: "x".repeat(61), description: "" }).name, "pageNameTooLong");
  assert.equal(validatePage({ name: "x", description: "x".repeat(501) }).description, "pageDescriptionTooLong");
  assert.equal(validatePage({ name: "x", description: "", selection: { organization: false, units: [], users: [] } }).scope, "scopeRequired");
});

test("ошибки базы по страницам", () => {
  assert.equal(pageDbError({ message: "scope_required" }), "scopeRequired");
  assert.equal(pageDbError({ message: "scope_invalid" }), "scopeInvalid");
  assert.equal(pageDbError({ message: "module_unavailable" }), "moduleUnavailable");
  assert.equal(pageDbError({ message: "forbidden" }), "forbidden");
});

test("«Новая»: не открывали и моложе 30 дней; новые — сверху", () => {
  const now = new Date("2026-11-24T12:00:00Z").getTime();
  const fresh = { id: "1", createdAt: "2026-11-23T12:00:00Z" };
  const old = { id: "2", createdAt: "2026-09-01T12:00:00Z" };
  const seenFresh = { id: "3", createdAt: "2026-11-24T10:00:00Z" };
  const seen = new Set(["3"]);
  assert.equal(isNewPage(fresh, seen, now), true);
  assert.equal(isNewPage(old, seen, now), false);
  assert.equal(isNewPage(seenFresh, seen, now), false);
  assert.deepEqual(sortPages([old, seenFresh, fresh], seen, now).map((p) => p.id), ["1", "3", "2"]);
});

test("поиск и фильтр по модулю", () => {
  const pages = [{ name: "Задачи склада", moduleKey: "tasks" }, { name: "Общий чат", moduleKey: "chat" }];
  assert.equal(filterPages(pages, "склад", "all").length, 1);
  assert.equal(filterPages(pages, "", "chat")[0]!.name, "Общий чат");
  assert.equal(filterPages(pages, "чат", "tasks").length, 0);
});

test("кто создаёт и настраивает страницы", () => {
  assert.equal(canCreatePage("manager"), true);
  assert.equal(canCreatePage("employee"), false);
  assert.equal(canManagePage("admin", "x", "me"), true);
  assert.equal(canManagePage("manager", "me", "me"), true);
  assert.equal(canManagePage("manager", "x", "me"), false);
  assert.equal(canManagePage("employee", "me", "me"), false);
});
