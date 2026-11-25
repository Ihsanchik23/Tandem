"use server";

// Серверное действие для клиентских изменений, которые пишут в базу напрямую
// (загрузка фото профиля и логотипа): сбросить кэш страниц, где эта картинка видна.
// Только сброс кэша — данные и права по-прежнему у базы (RLS).
import { getUserId } from "@/lib/auth/session";
import { revalidateMembership } from "./revalidate";

/** Фото профиля или логотип компании изменились: профили, «Работа», компании, поиск. */
export async function revalidateAfterImageChange(): Promise<void> {
  if (!(await getUserId())) return;
  revalidateMembership();
}
