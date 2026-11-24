import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext, isPublicPath, withNext } from "./redirect.ts";
import { authErrorKey } from "./errors.ts";

test("safeNext пропускает внутренние адреса", () => {
  assert.equal(safeNext("/invite/abc123"), "/invite/abc123");
  assert.equal(safeNext("/work?tab=1"), "/work?tab=1");
});

test("safeNext не пускает на чужие сайты и мусор", () => {
  for (const bad of [null, "", "https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "javascript:alert(1)", "/a\nb", "/" + "a".repeat(600)]) {
    assert.equal(safeNext(bad), null, String(bad));
  }
});

test("safeNext не возвращает на экраны входа", () => {
  assert.equal(safeNext("/login"), null);
  assert.equal(safeNext("/signup?next=/x"), null);
  assert.equal(safeNext("/auth/confirm"), null);
});

test("открытые без входа адреса", () => {
  for (const p of ["/login", "/signup", "/forgot-password", "/check-email", "/auth/confirm", "/invite/tok"]) {
    assert.equal(isPublicPath(p), true, p);
  }
  for (const p of ["/", "/work", "/reset-password", "/@ivan", "/invites-admin"]) {
    assert.equal(isPublicPath(p), false, p);
  }
});

test("withNext кодирует адрес возврата", () => {
  assert.equal(withNext("/login", "/invite/a b"), "/login?next=%2Finvite%2Fa%20b");
  assert.equal(withNext("/login", null), "/login");
});

test("ошибки Supabase Auth переводятся в понятные тексты", () => {
  assert.equal(authErrorKey({ code: "invalid_credentials" }), "invalidCredentials");
  assert.equal(authErrorKey({ code: "over_email_send_rate_limit", status: 429 }), "emailRateLimited");
  assert.equal(authErrorKey({ message: "rate_limited" }), "rateLimited");
  assert.equal(authErrorKey({ status: 429 }), "rateLimited");
  assert.equal(authErrorKey({ code: "что-то_новое", status: 500 }), "generic");
  assert.equal(authErrorKey(null), "generic");
});
