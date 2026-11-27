"use server";

// Создание и настройка рабочих страниц. Права (роль, Scope менеджера, подписка) проверяют функции базы.
import { revalidateWork } from "@/lib/cache/revalidate";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKey } from "@/lib/i18n/ru";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany } from "@/lib/company/queries";
import { MODULES } from "@/modules/registry";
import { canCreatePage, pageDbError, toScopes, validatePage, type ModuleKey, type PageFieldErrors, type ScopeSelection } from "./logic";
import { getScopeOptions, type ScopeOptions } from "./scopeOptions";

export type PageResult = { error?: ErrorKey; fieldErrors?: PageFieldErrors };

// Рабочие страницы видны только в «Работе» (панель и сами страницы).
function refresh() {
  revalidateWork();
}

// Возвращает id новой страницы — панель создания сама откроет её.
export async function createPage(input: {
  organizationId: string;
  module: ModuleKey;
  name: string;
  description: string;
  selection: ScopeSelection;
}): Promise<PageResult & { pageId?: string }> {
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
  if (error || !pageId) return { error: error ? pageDbError(error) : "generic" };
  refresh();
  return { pageId };
}

export type NewPageData = {
  organizationId: string;
  options: ScopeOptions;
  /** Сколько страниц каждого модуля уже есть — только если у какого-то модуля задан лимит. */
  used: Record<string, number>;
};

// Данные для панели «Новая страница»: что можно выбрать в «Кому доступна» (только для показа —
// права проверяет create_page). Грузятся, когда панель открывают.
export async function loadNewPageData(): Promise<{ data?: NewPageData; error?: ErrorKey }> {
  const userId = await getUserId();
  if (!userId) return { error: "sessionExpired" };
  const company = await getMyCompany(userId);
  if (!company || !canCreatePage(company.role)) return { error: "forbidden" };
  const options = await getScopeOptions(company.org.id, userId, company.role);
  const used: Record<string, number> = {};
  if (MODULES.some((m) => m.limit !== null)) {
    const supabase = await createClient();
    const { data } = await supabase.from("pages").select("module_key").eq("organization_id", company.org.id).eq("status", "active");
    for (const r of data ?? []) used[r.module_key] = (used[r.module_key] ?? 0) + 1;
  }
  return { data: { organizationId: company.org.id, options, used } };
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
