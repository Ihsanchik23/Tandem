import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanProfileInput, isAutoUsername, normalizeUsername, profileDbError, validateProfile } from "./validation.ts";
import { pluralRu, format } from "../i18n/format.ts";

const ok = { first_name: "Айдана", last_name: "Серикбаева", username: "aidana_s", city: "Астана", bio: "" };

test("корректный профиль проходит проверку", () => {
  assert.deepEqual(validateProfile(ok), {});
});

test("имя пользователя: формат как в базе", () => {
  for (const good of ["abc", "aidana_s", "user_2026", "a".repeat(30)]) {
    assert.equal(validateProfile({ ...ok, username: good }).username, undefined, good);
  }
  for (const bad of ["ab", "a".repeat(31), "Айдана", "aidana.s", "aidana s", "aidana-s", ""]) {
    assert.equal(validateProfile({ ...ok, username: bad }).username, "usernameFormat", bad);
  }
});

test("ввод имени пользователя приводится к строчным и без @", () => {
  assert.equal(normalizeUsername("  @Aidana_S "), "aidana_s");
  assert.equal(cleanProfileInput({ username: "@IVAN" }).username, "ivan");
});

test("обязательные поля и длина", () => {
  const e = validateProfile({ ...ok, first_name: " ".trim(), last_name: "x".repeat(61), city: "г".repeat(61), bio: "б".repeat(301) });
  assert.deepEqual(e, { first_name: "firstNameRequired", last_name: "nameTooLong", city: "cityTooLong", bio: "bioTooLong" });
  assert.deepEqual(validateProfile({ ...ok, bio: "б".repeat(300), city: "г".repeat(60) }), {});
});

test("автоматическое имя из регистрации распознаётся", () => {
  assert.equal(isAutoUsername("user_786638d34a0c"), true);
  assert.equal(isAutoUsername("user_2026"), false);
  assert.equal(isAutoUsername("aidana_s"), false);
});

test("ошибки базы переводятся в понятные тексты", () => {
  assert.deepEqual(profileDbError({ code: "23505", message: "duplicate key value violates unique constraint" }), { field: "username", key: "usernameTaken" });
  assert.deepEqual(profileDbError({ code: "23514", message: 'violates check constraint "profiles_username_check"' }), { field: "username", key: "usernameFormat" });
  assert.deepEqual(profileDbError({ code: "42501" }), { key: "generic" });
});

test("русские формы слова по числу и подстановка", () => {
  const f = ["сотрудник", "сотрудника", "сотрудников"] as const;
  assert.deepEqual([1, 2, 5, 11, 21, 22, 112, 0].map((n) => pluralRu(n, f)), ["сотрудник", "сотрудника", "сотрудников", "сотрудников", "сотрудник", "сотрудника", "сотрудников", "сотрудников"]);
  assert.equal(format("{n} из {max}", { n: 3, max: 300 }), "3 из 300");
});
