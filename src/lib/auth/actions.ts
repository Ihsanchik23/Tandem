"use server";

// Серверные действия входа и регистрации. Права здесь не проверяются:
// Supabase Auth сам решает, пускать ли человека, а данные защищает RLS.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKey } from "@/lib/i18n/ru";
import { authErrorKey } from "./errors";
import { AFTER_LOGIN_PATH, AFTER_SIGNUP_PATH, safeNext } from "./redirect";
import { isAlreadyRegistered } from "./signup";

export type AuthFormState = {
  error?: ErrorKey;
  notice?: "resent";
  // Введённые значения (без паролей), чтобы форма не очищалась при ошибке.
  values?: Record<string, string>;
};

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function rawField(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v : "";
}

// Адрес сайта, с которого пришёл запрос (localhost, продакшен или тестовая версия Vercel).
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function confirmUrl(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}`;
}

function checkEmailUrl(kind: "signup" | "recovery", email: string, next: string | null): string {
  const params = new URLSearchParams({ kind, email });
  if (next) params.set("next", next);
  return `/check-email?${params.toString()}`;
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const firstName = field(formData, "first_name");
  const lastName = field(formData, "last_name");
  const email = field(formData, "email").toLowerCase();
  const password = rawField(formData, "password");
  const next = safeNext(field(formData, "next"));
  const values = { first_name: firstName, last_name: lastName, email };

  if (!firstName || !lastName || !email || !password) return { error: "required", values };
  if (!EMAIL_RE.test(email)) return { error: "invalidEmail", values };
  if (password.length < MIN_PASSWORD) return { error: "passwordTooShort", values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Профиль в базе создаётся из этих полей (функция handle_new_user).
      data: { first_name: firstName.slice(0, 60), last_name: lastName.slice(0, 60) },
      emailRedirectTo: confirmUrl(await siteOrigin(), next ?? AFTER_SIGNUP_PATH),
    },
  });
  if (error) return { error: authErrorKey(error), values };

  // Адрес уже зарегистрирован и подтверждён — говорим об этом прямо в форме.
  // Осознанное решение для закрытого пилота: так можно проверить, занят ли адрес
  // (см. docs/handoff.md). Не подтверждённый адрес — Supabase сам шлёт письмо ещё раз.
  if (isAlreadyRegistered(data.user)) return { error: "emailTaken", values };

  redirect(checkEmailUrl("signup", email, next));
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email").toLowerCase();
  const password = rawField(formData, "password");
  const next = safeNext(field(formData, "next"));
  const values = { email };

  if (!email || !password) return { error: "required", values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorKey(error), values };

  redirect(next ?? AFTER_LOGIN_PATH);
}

export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email").toLowerCase();
  const values = { email };

  if (!email) return { error: "required", values };
  if (!EMAIL_RE.test(email)) return { error: "invalidEmail", values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: confirmUrl(await siteOrigin(), "/reset-password"),
  });
  if (error) return { error: authErrorKey(error), values };

  redirect(checkEmailUrl("recovery", email, null));
}

export async function resendEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email").toLowerCase();
  const kind = field(formData, "kind") === "recovery" ? "recovery" : "signup";
  const next = safeNext(field(formData, "next"));

  if (!EMAIL_RE.test(email)) return { error: "invalidEmail" };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } =
    kind === "recovery"
      ? await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: confirmUrl(origin, "/reset-password"),
        })
      : await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: confirmUrl(origin, next ?? AFTER_SIGNUP_PATH) },
        });
  if (error) return { error: authErrorKey(error) };
  return { notice: "resent" };
}

export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = rawField(formData, "password");
  const confirm = rawField(formData, "confirm_password");

  if (!password || !confirm) return { error: "required" };
  if (password.length < MIN_PASSWORD) return { error: "passwordTooShort" };
  if (password !== confirm) return { error: "passwordsDontMatch" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorKey(error) };

  redirect(`${AFTER_LOGIN_PATH}?notice=passwordChanged`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
