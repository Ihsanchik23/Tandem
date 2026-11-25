// Что обновлять после изменений — точечно, а не весь сайт.
// Вызывается только из серверных действий ("use server", в т.ч. lib/cache/actions.ts). Права здесь не проверяются:
// это лишь сброс кэша страниц, данные по-прежнему отдаёт база по RLS.
//
// Next очищает кэш браузера после любого revalidatePath, поэтому главная польза — на сервере:
// обновляются только адреса, которые зависят от изменённых данных.
import { revalidatePath } from "next/cache";

/** Весь раздел «Работа»: панель компании (страницы, логотип), сотрудники, структура, страницы. */
export function revalidateWork() {
  revalidatePath("/work", "layout");
}

/** Публичные профили людей (/@username): место работы, должность, имя. */
export function revalidateProfiles() {
  revalidatePath("/u/[username]", "page");
}

/** Страницы компаний (/c/slug и редактирование). */
export function revalidateCompanies() {
  revalidatePath("/c/[slug]", "layout");
}

/** Просмотр профиля или компании справа в «Поиске» (?person= / ?company=). */
export function revalidateSearch() {
  revalidatePath("/search");
}

/** Страница приглашения по ссылке. */
export function revalidateInvites() {
  revalidatePath("/invite/[token]", "page");
}

/** Изменилось, кто в какой компании и с какой ролью: «Работа», профили, компании, поиск. */
export function revalidateMembership() {
  revalidateWork();
  revalidateProfiles();
  revalidateCompanies();
  revalidateSearch();
}
