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

import { canManageMember, roleOptions, canEditPosition } from "./permissions.ts";
import { invitePath, isInviteActive } from "./invite.ts";

test("кто кому может менять роль и кого удалять", () => {
  const roles = ["owner", "admin", "manager", "employee"] as const;
  // [кто, кого] → можно ли
  const allowed = new Set(["owner>admin", "owner>manager", "owner>employee", "admin>manager", "admin>employee"]);
  for (const my of roles) {
    for (const target of roles) {
      assert.equal(canManageMember(my, target, false), allowed.has(`${my}>${target}`), `${my}>${target}`);
      assert.equal(canManageMember(my, target, true), false, `себя: ${my}`);
    }
  }
  assert.equal(canManageMember(null, "employee", false), false);
});

test("варианты ролей зависят от того, кто меняет", () => {
  assert.deepEqual(roleOptions("owner"), ["admin", "manager", "employee"]);
  assert.deepEqual(roleOptions("admin"), ["manager", "employee"]);
  assert.deepEqual(roleOptions("manager"), []);
  assert.deepEqual(roleOptions("employee"), []);
  assert.equal(canEditPosition("admin"), true);
  assert.equal(canEditPosition("manager"), false);
});

test("ссылка-приглашение: адрес и срок", () => {
  assert.equal(invitePath("abc123"), "/invite/abc123");
  const now = new Date("2026-11-24T12:00:00Z");
  assert.equal(isInviteActive({ revoked_at: null, expires_at: "2026-11-27T12:00:00Z" }, now), true);
  assert.equal(isInviteActive({ revoked_at: null, expires_at: "2026-11-24T11:59:59Z" }, now), false);
  assert.equal(isInviteActive({ revoked_at: "2026-11-24T10:00:00Z", expires_at: "2026-11-27T12:00:00Z" }, now), false);
});

test("ошибки приглашений и сотрудников переводятся в тексты", () => {
  for (const [code, key] of [
    ["invite_invalid", "inviteInvalid"],
    ["no_free_seats", "noFreeSeats"],
    ["already_member_here", "alreadyMemberHere"],
    ["owner_cannot_leave", "ownerCannotLeave"],
    ["not_member", "notMember"],
    ["not_found", "notFound"],
    ["invalid_role", "invalidRole"],
    ["forbidden", "forbidden"],
    ["subscription_inactive", "subscriptionInactive"],
  ] as const) {
    assert.deepEqual(companyDbError({ message: code }), { key }, code);
  }
  assert.deepEqual(companyDbError({ code: "23514", message: "memberships_position_check" }), { key: "positionTooLong" });
});
