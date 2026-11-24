// Рабочие страницы компании. Метаданные видят все сотрудники (Canvas с замками);
// доступ текущего пользователя — его строки page_access (Owner/Admin получают все страницы).
import { createClient } from "@/lib/supabase/server";
import type { ModuleKey, ScopeRow } from "./logic";

export type PageRow = {
  id: string;
  name: string;
  description: string | null;
  moduleKey: ModuleKey;
  archived: boolean;
  createdAt: string;
  createdBy: string | null;
  hasAccess: boolean;
  scopes: ScopeRow[];
};

export async function getCompanyPages(orgId: string, userId: string): Promise<PageRow[]> {
  const supabase = await createClient();
  const [{ data: pages }, { data: scopes }, { data: access }] = await Promise.all([
    supabase
      .from("pages")
      .select("id, name, description, module_key, status, created_at, created_by")
      .eq("organization_id", orgId),
    supabase.from("page_scopes").select("page_id, kind, unit_id, user_id").eq("organization_id", orgId),
    supabase.from("page_access").select("page_id").eq("organization_id", orgId).eq("user_id", userId),
  ]);
  const mine = new Set((access ?? []).map((a) => a.page_id));
  const byPage = new Map<string, ScopeRow[]>();
  for (const s of scopes ?? []) {
    const list = byPage.get(s.page_id) ?? [];
    list.push({ kind: s.kind, unit_id: s.unit_id, user_id: s.user_id });
    byPage.set(s.page_id, list);
  }
  return (pages ?? [])
    .filter((p) => p.module_key === "tasks" || p.module_key === "chat")
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      moduleKey: p.module_key as ModuleKey,
      archived: p.status === "archived",
      createdAt: p.created_at,
      createdBy: p.created_by,
      hasAccess: mine.has(p.id),
      scopes: byPage.get(p.id) ?? [],
    }));
}

export async function getPage(orgId: string, pageId: string, userId: string): Promise<PageRow | null> {
  const pages = await getCompanyPages(orgId, userId);
  return pages.find((p) => p.id === pageId) ?? null;
}
