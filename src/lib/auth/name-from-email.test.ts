import { test } from "node:test";
import assert from "node:assert/strict";
import { nameFromEmail } from "./name-from-email.ts";

const F = "Пользователь";

test("имя и фамилия из адреса почты: примеры из задачи", () => {
  assert.deepEqual(nameFromEmail("ihsan.kairbek@gmail.com", F), { first_name: "Ihsan", last_name: "Kairbek" });
  assert.deepEqual(nameFromEmail("ihsan94@gmail.com", F), { first_name: "Ihsan", last_name: "" });
  assert.deepEqual(nameFromEmail("12345@mail.ru", F), { first_name: "Пользователь", last_name: "" });
});

test("имя из почты: «+», разделители, регистр, лишние куски", () => {
  assert.deepEqual(nameFromEmail("a+promo@x.kz", F), { first_name: "A", last_name: "" });
  assert.deepEqual(nameFromEmail("ivan-petrov_k@x.kz", F), { first_name: "Ivan", last_name: "Petrov" });
  assert.deepEqual(nameFromEmail("IHSAN.KAIRBEK@x.kz", F), { first_name: "Ihsan", last_name: "Kairbek" });
  assert.deepEqual(nameFromEmail("2024.anna..__smith-99@x.kz", F), { first_name: "Anna", last_name: "Smith" });
  assert.deepEqual(nameFromEmail("123+anna@x.kz", F), { first_name: "Пользователь", last_name: "" });
});

test("имя из почты не длиннее 60 символов", () => {
  const r = nameFromEmail(`${"a".repeat(80)}.${"b".repeat(70)}@x.kz`, F);
  assert.equal(r.first_name.length, 60);
  assert.equal(r.last_name.length, 60);
});
