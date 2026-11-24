import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export const PAGE_SIZE = 20;

export type Tab = "companies" | "people";
export type PersonRow = Database["public"]["Functions"]["search_people"]["Returns"][number];
export type CompanyRow = Database["public"]["Functions"]["search_organizations"]["Returns"][number];

export type SearchResult =
  | { tab: "people"; items: PersonRow[]; hasMore: boolean }
  | { tab: "companies"; items: CompanyRow[]; hasMore: boolean };

// Каталог: RPC search_people / search_organizations (поиск по pg_trgm, RLS действует).
export async function runSearch(tab: Tab, query: string, city: string, offset: number): Promise<SearchResult> {
  const supabase = createClient();
  const args = {
    p_query: query.trim(),
    // Город сравнивается без учёта регистра, целиком.
    p_city: city.trim() || undefined,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  };
  if (tab === "people") {
    const { data, error } = await supabase.rpc("search_people", args);
    if (error) throw error;
    return { tab, items: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE };
  }
  const { data, error } = await supabase.rpc("search_organizations", args);
  if (error) throw error;
  return { tab, items: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE };
}
