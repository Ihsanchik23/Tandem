import { test } from "node:test";
import assert from "node:assert/strict";
import { ru } from "./ru.ts";

test("русский словарь отдаётся по умолчанию", () => {
  const messages = ru;
  assert.equal(messages.app.name, "Tandem");
  assert.ok(messages.errors.generic.length > 0);
});
