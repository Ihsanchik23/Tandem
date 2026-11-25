// Проверка адреса возврата (?next=...). Разрешены только пути внутри нашего сайта,
// чтобы ссылкой нельзя было увести человека на чужой сайт.
export function safeNext(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  if (value.length > 512) return null;
  if (!value.startsWith("/")) return null;
  // "//evil.com" и "/\evil.com" браузер считает адресом другого сайта.
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  // Не возвращаем на сами экраны входа и на служебный адрес.
  const path = value.split(/[?#]/)[0];
  if (AUTH_ONLY_PATHS.includes(path) || path.startsWith("/auth/")) return null;
  return value;
}

// Экраны, которые нужны только без входа: вошедшего с них уводим дальше.
export const AUTH_ONLY_PATHS = ["/login", "/signup", "/forgot-password"];

// Адреса, которые открываются без входа.
export function isPublicPath(pathname: string): boolean {
  return (
    AUTH_ONLY_PATHS.includes(pathname) ||
    pathname === "/check-email" ||
    pathname.startsWith("/auth/") ||
    pathname === "/invite" ||
    pathname.startsWith("/invite/")
  );
}

// Пять разделов, которые гость видит без входа (на телефоне — гостевой экран с кнопками входа,
// на компьютере — экран входа). Только сами адреса, без параметров: /search?q=…, /work/…, /@user
// по-прежнему ведут на /login. Данных гость не получает — страницы без сессии их не запрашивают,
// а база отдаёт данные только по RLS.
export const GUEST_PATHS = ["/", "/search", "/work", "/messages", "/profile"] as const;

export function isGuestPath(pathname: string, search: string): boolean {
  return (GUEST_PATHS as readonly string[]).includes(pathname) && (search === "" || search === "?");
}

// Куда вести после входа и после регистрации (решение 2026-11-24, ТЗ разделы 7 и 15).
export const AFTER_LOGIN_PATH = "/work";
export const AFTER_SIGNUP_PATH = "/";

// Собирает адрес с ?next=..., если next задан.
export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
