"use server";

// Создание и настройка рабочих страниц. Права (роль, Scope менеджера, подписка) проверяют функции базы.
import { redirect } from "next/navigation";
import { revalidateWork } from "@/lib/cache/revalidate";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKey } from "@/lib/i18n/ru";
import { pageDbError, toScopes, validatePage, type ModuleKey, type PageFieldErrors, type ScopeSelection } from "./logic";

export type PageResult = { error?: ErrorKey; fieldErrors?: PageFieldErrors };

// Рабочие страницы видны только в «Работе» (панель и сами страницы).
function refresh() {
  revalidateWork();
}

export async function createPage(input: {
  organizationId: string;
  module: ModuleKey;
  name: string;
  description: string;
  selection: ScopeSelection;
  returnToCanvas?: boolean;
}): Promise<PageResult> {
  const fieldErrors = validatePage(input);
  if (Object.keys(fieldErrors).length > 0) return { error: "fixFields", fieldErrors };
  const supabase = await createClient();
  const { data: pageId, error } = await supabase.rpc("create_page", {
    p_org: input.organizationId,
    p_module: input.module,
    p_name: input.name.trim(),
    p_scopes: toScopes(input.selection),
    p_description: input.description.trim() || undefined,
  });
  if (error) return { error: pageDbError(error) };
  refresh();
  // Создали из «+» на «Структуре» — возвращаемся туда, холст покажет новую карточку.
  if (input.returnToCanvas && pageId) redirect(`/work/structure?focus=page-${pageId}`);
  // Иначе — к списку, новая страница отмечена «Новая».
  redirect("/work");
}

export async function updatePage(pageId: string, name: string, description: string): Promise<PageResult> {
  const fieldErrors = validatePage({ name, description });
  if (Object.keys(fieldErrors).length > 0) return { error: "fixFields", fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_page", {
    p_page: pageId,
    p_name: name.trim(),
    p_description: description.trim() || undefined,
  });
  if (error) return { error: pageDbError(error) };
  refresh();
  return {};
}

export async function updatePageScope(pageId: string, selection: ScopeSelection): Promise<PageResult> {
  const fieldErrors = validatePage({ name: "x", description: "", selection });
  if (fieldErrors.scope) return { error: fieldErrors.scope };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_page_scope", { p_page: pageId, p_scopes: toScopes(selection) });
  if (error) return { error: pageDbError(error) };
  refresh();
  return {};
}

// Для кнопок с подтверждением (ConfirmAction): id страницы приходит из формы.
export async function archivePage(_prev: PageResult, formData: FormData): Promise<PageResult> {
  return setArchived(String(formData.get("page_id") ?? ""), true);
}
export async function restorePage(_prev: PageResult, formData: FormData): Promise<PageResult> {
  return setArchived(String(formData.get("page_id") ?? ""), false);
}

async function setArchived(pageId: string, archived: boolean): Promise<PageResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_page_archived", { p_page: pageId, p_archived: archived });
  if (error) return { error: pageDbError(error) };
  refresh();
  return {};
}

// Индивидуальный доступ к странице (Scope «человек»), остальной Scope не меняется.
// Права (как у смены Scope) и подписку проверяют функции базы grant_page_user / revoke_page_user.
export async function grantPageUser(pageId: string, userId: string): Promise<PageResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("grant_page_user", { p_page: pageId, p_user: userId });
  if (error?.message === "not_member") return { error: "personNotMember" };
  if (error) return { error: pageDbError(error) };
  refresh();
  return {};
}

export async function revokePageUser(pageId: string, userId: string): Promise<PageResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_page_user", { p_page: pageId, p_user: userId });
  if (error?.message === "scope_required") return { error: "lastScope" };
  if (error) return { error: pageDbError(error) };
  refresh();
  return {};
}
