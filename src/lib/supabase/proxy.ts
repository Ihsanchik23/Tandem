// Обновление сессии Supabase на каждом запросе (вызывается из src/proxy.ts)
// и перенаправления: без входа — на /login (кроме пяти гостевых разделов), вошедшего — с экранов входа в «Работу».
// Это только удобство: данные защищают RLS и RPC в базе.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AFTER_LOGIN_PATH,
  AUTH_ONLY_PATHS,
  guestRewritePath,
  isGuestPath,
  isPublicPath,
  safeNext,
  sectionPathOfGuestPage,
  withNext,
} from "@/lib/auth/redirect";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Не вставлять код между созданием клиента и getClaims():
  // этот вызов обновляет токен, если он истёк.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = !!data?.claims?.sub;

  const { pathname, search } = request.nextUrl;

  if (!isSignedIn && pathname === "/reset-password") {
    // Ссылка сброса не сработала или устарела — предлагаем запросить новую.
    return redirectWithCookies(request, response, "/forgot-password?error=linkExpired");
  }

  // Служебные гостевые страницы напрямую не открываем — ведём на адрес раздела.
  const sectionPath = sectionPathOfGuestPage(pathname);
  if (sectionPath) return redirectWithCookies(request, response, sectionPath);

  // Гость в одном из пяти разделов: показываем статичный гостевой экран, адрес не меняется.
  if (!isSignedIn && isGuestPath(pathname, search)) {
    return rewriteWithCookies(request, response, guestRewritePath(pathname)!);
  }

  if (!isSignedIn && !isPublicPath(pathname)) {
    const next = pathname === "/" ? null : safeNext(pathname + search);
    return redirectWithCookies(request, response, withNext("/login", next));
  }

  if (isSignedIn && AUTH_ONLY_PATHS.includes(pathname)) {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    return redirectWithCookies(request, response, next ?? AFTER_LOGIN_PATH);
  }

  return response;
}

// Подмена адреса (rewrite) с сохранением обновлённых cookies сессии.
function rewriteWithCookies(request: NextRequest, response: NextResponse, path: string) {
  const rewrite = NextResponse.rewrite(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie));
  return rewrite;
}

// Перенаправление с сохранением обновлённых cookies сессии.
function redirectWithCookies(request: NextRequest, response: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
