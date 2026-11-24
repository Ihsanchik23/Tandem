import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCompanyInput, companyDbError, normalizeSlug, slugify, validateCompany } from "./validation.ts";

test("адрес страницы из названия: латиница, дефисы", () => {
  assert.equal(slugify("Магазин Береке"), "magazin-bereke");
  assert.equal(slugify("ТОО «Жұлдыз» & Co."), "too-zhuldyz-co");
  assert.equal(slugify("  Shop №1  "), "shop-1");
  assert.equal(slugify("Щука ёж"), "schuka-ezh");
  assert.equal(slugify("!!!"), "");
  const long = slugify("а".repeat(30) + " " + "б".repeat(30));
  assert.ok(long.length <= 40 && !long.endsWith("-"));
});

test("ручной ввод адреса приводится к допустимому виду", () => {
  assert.equal(normalizeSlug("My Shop"), "my-shop");
  assert.equal(normalizeSlug("Магазин_1"), "1");
  assert.equal(cleanCompanyInput({ slug: "-abc-" }).slug, "abc");
});

test("проверка полей компании", () => {
  const ok = { name: "Береке", slug: "bereke", city: "", description: "" };
  assert.deepEqual(validateCompany(ok, { withSlug: true }), {});
  assert.equal(validateCompany({ ...ok, name: "" }, { withSlug: true }).name, "companyNameRequired");
  assert.equal(validateCompany({ ...ok, name: "x".repeat(101) }, { withSlug: true }).name, "companyNameTooLong");
  assert.equal(validateCompany({ ...ok, slug: "ab" }, { withSlug: true }).slug, "slugFormat");
  assert.equal(validateCompany({ ...ok, slug: "ab" }, { withSlug: false }).slug, undefined);
  assert.equal(validateCompany({ ...ok, city: "x".repeat(61) }, { withSlug: true }).city, "cityTooLong");
  assert.equal(validateCompany({ ...ok, description: "x".repeat(1001) }, { withSlug: true }).description, "descriptionTooLong");
});

test("ошибки базы при создании компании переводятся в тексты", () => {
  assert.deepEqual(companyDbError({ message: "subscription_required" }), { key: "subscriptionRequired" });
  assert.deepEqual(companyDbError({ message: "already_member" }), { key: "alreadyMember" });
  assert.deepEqual(companyDbError({ code: "23505", message: "duplicate key organizations_slug_key" }), {
    field: "slug",
    key: "slugTaken",
  });
  assert.deepEqual(companyDbError({ message: "что-то новое" }), { key: "generic" });
});
