// Заголовок в шапке телефона по адресу страницы.
import { ru as t } from "../../lib/i18n/ru.ts";

export function sectionTitle(path: string, myUsername: string | null): string {
  const n = t.nav;
  if (path === "/") return n.home;
  if (path.startsWith("/search")) return n.search;
  if (path.startsWith("/messages")) return n.messages;
  if (path.startsWith("/work/structure")) return t.canvas.title;
  if (path.startsWith("/work/people")) return t.company.peopleTitle;
  if (path.startsWith("/work/new")) return t.company.createTitle;
  if (path.startsWith("/work/pages/new")) return t.pages.createTitle;
  if (path.startsWith("/work/p/")) return t.pages.title;
  if (path.startsWith("/work")) return n.work;
  if (path.startsWith("/c/")) return t.company.profileTitle;
  if (path.startsWith("/profile")) return n.profile;
  if (myUsername && (path === `/@${myUsername}` || path === `/u/${myUsername}`)) return n.profile;
  if (path.startsWith("/@") || path.startsWith("/u/")) return t.profile.title;
  return t.app.name;
}
