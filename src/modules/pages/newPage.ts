"use client";

// Панель «Новая страница» открывается сменой адреса (?new-page=1, ?unit=<id> или ?scope=organization)
// без запроса к серверу — как карточка задачи и карточка сотрудника. «Назад» закрывает панель.
export const NEW_PAGE = "new-page";
const PARAMS = [NEW_PAGE, "unit", "scope"];

// Открыли нажатием в приложении (есть запись в истории) — закрываем через «Назад».
let pushed = false;

export function newPageHref(base: string, opts: { unit?: string; scope?: "organization" } = {}): string {
  const [path, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  PARAMS.forEach((k) => params.delete(k));
  params.set(NEW_PAGE, "1");
  if (opts.unit) params.set("unit", opts.unit);
  if (opts.scope) params.set("scope", opts.scope);
  return `${path}?${params.toString()}`;
}

/** Открыть панель поверх текущего экрана. Для onClick ссылки: Cmd/Ctrl-клик откроет вкладку как обычно. */
export function openNewPage(e: React.MouseEvent | null, opts: { unit?: string; scope?: "organization" } = {}) {
  if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || ("button" in e && e.button !== 0))) return;
  e?.preventDefault();
  const here = `${window.location.pathname}${window.location.search}`;
  window.history.pushState(null, "", newPageHref(here, opts));
}

/** Адрес без параметров панели. */
export function withoutNewPage(): string {
  const params = new URLSearchParams(window.location.search);
  PARAMS.forEach((k) => params.delete(k));
  const q = params.toString();
  return `${window.location.pathname}${q ? `?${q}` : ""}`;
}

export function closeNewPage() {
  if (pushed) {
    pushed = false;
    window.history.back();
  } else {
    window.history.replaceState(null, "", withoutNewPage());
  }
}

/** Панель открылась переходом внутри приложения — в истории есть запись, закрываем через «Назад». */
export function markNewPagePushed() {
  pushed = true;
}

/** Панель закрылась сама (кнопка «Назад» браузера) — запись в истории уже снята. */
export function forgetNewPagePush() {
  pushed = false;
}
