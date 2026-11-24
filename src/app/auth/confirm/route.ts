// Сюда ведёт ссылка из письма (подтверждение email, сброс пароля).
// Поддерживаем оба вида ссылок:
//  - ?code=...            — стандартный шаблон Supabase (работает в том же браузере);
//  - ?token_hash=&type=   — свой шаблон после подключения SMTP (работает в любом браузере).
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authErrorKey } from "@/lib/auth/errors";
import type { ErrorKey } from "@/lib/i18n/ru";
import { AFTER_SIGNUP_PATH, safeNext } from "@/lib/auth/redirect";

const RESET_PATH = "/reset-password";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next")) ?? AFTER_SIGNUP_PATH;
  const isRecovery = next === RESET_PATH || url.searchParams.get("type") === "recovery";

  const go = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const fail = (key: ErrorKey) =>
    go(isRecovery ? `/forgot-password?error=${key}` : `/login?error=${key}`);

  // Supabase сам вернул ошибку (например, ссылка устарела).
  const linkError = url.searchParams.get("error_code") ?? url.searchParams.get("error");
  if (linkError) return fail(authErrorKey({ code: linkError === "access_denied" ? "otp_expired" : linkError }));

  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return fail(authErrorKey(error));
    return go(type === "recovery" ? RESET_PATH : next);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return go(next);
    // Ссылку открыли в другом браузере (нет ключа PKCE в cookies). Supabase выдаёт код
    // только после проверки письма, значит email уже подтверждён — просим просто войти.
    // Для сброса пароля так не получится — объясняем, что делать.
    const otherBrowser = error.code === "pkce_code_verifier_not_found";
    if (isRecovery) return fail(otherBrowser ? "linkOtherBrowser" : "linkExpired");
    if (otherBrowser) {
      const nextParam = next !== AFTER_SIGNUP_PATH ? `&next=${encodeURIComponent(next)}` : "";
      return go(`/login?notice=emailConfirmed${nextParam}`);
    }
    return fail("linkExpired");
  }

  return fail("linkExpired");
}
