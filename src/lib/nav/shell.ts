// Данные для оболочки после входа: шапка, панель компании, навигация.
// cache() — один запрос на страницу, даже если данные нужны и макету, и разделу «Работа».
import { cache } from "react";
import { getUserId } from "@/lib/auth/session";
import { getMyCompany, type MemberRole } from "@/lib/company/queries";
import { createClient } from "@/lib/supabase/server";

export type ShellPage = { id: string; name: string; moduleKey: string; createdAt: string };
export type ShellData = {
  username: string | null;
  company: { name: string; slug: string; logoUrl: string | null; role: MemberRole } | null;
  pages: ShellPage[]; // доступные мне рабочие страницы (page_access), без архивных
};

const EMPTY: ShellData = { username: null, company: null, pages: [] };

export const getShellData = cache(async (): Promise<ShellData> => {
  const userId = await getUserId();
  if (!userId) return EMPTY;
  const supabase = await createClient();
  const [{ data: profile }, company, { data: access }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    getMyCompany(userId),
    // RLS отдаёт только мои строки page_access; страницы — только активные.
    supabase.from("page_access").select("pages(id, name, module_key, status, created_at)").eq("user_id", userId),
  ]);
  const pages = (access ?? [])
    .flatMap((a) => (a.pages && a.pages.status === "active" ? [a.pages] : []))
    .map((p) => ({ id: p.id, name: p.name, moduleKey: p.module_key, createdAt: p.created_at }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return {
    username: profile?.username ?? null,
    company: company
      ? { name: company.org.name, slug: company.org.slug, logoUrl: company.org.logo_url, role: company.role }
      : null,
    pages,
  };
});
