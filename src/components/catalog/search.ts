import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export const PAGE_SIZE = 20;

export type Tab = "companies" | "people";
// Численность компании: от–до (null — без границы). Город ищется строкой поиска (по штаб-квартире).
export type CatalogFilters = { minMembers: number | null; maxMembers: number | null };
export type PersonRow = Database["public"]["Functions"]["search_people"]["Returns"][number];
export type CompanyRow = Database["public"]["Functions"]["search_organizations_filtered"]["Returns"][number];

export type SearchResult =
  | { tab: "people"; items: PersonRow[]; hasMore: boolean }
  | { tab: "companies"; items: CompanyRow[]; hasMore: boolean };

// Фильтры применяются в базе до LIMIT/OFFSET, чтобы страницы выдачи оставались полными.
export async function runSearch(tab: Tab, query: string, filters: CatalogFilters, offset: number): Promise<SearchResult> {
  const supabase = createClient();
  const commonArgs = {
    p_query: query.trim(),
    p_limit: PAGE_SIZE,
    p_offset: offset,
  };
  if (tab === "people") {
    const { data, error } = await supabase.rpc("search_people", commonArgs);
    if (error) throw error;
    return { tab, items: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE };
  }
  // Строка поиска находит компании и по названию, и по городу штаб-квартиры (organizations.city).
  const { data, error } = await supabase.rpc("search_organizations_filtered", {
    ...commonArgs,
    p_min_members: filters.minMembers ?? undefined,
    p_max_members: filters.maxMembers ?? undefined,
  });
  if (error) throw error;
  return { tab, items: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE };
}
