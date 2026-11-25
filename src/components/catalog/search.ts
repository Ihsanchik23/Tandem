import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

export const PAGE_SIZE = 20;

export type Tab = "companies" | "people";
export type StaffSize = "all" | "0-10" | "11-50" | "51-200" | "201+";
export type CatalogFilters = { city: string; staffSize: StaffSize };
export type PersonRow = Database["public"]["Functions"]["search_people"]["Returns"][number];
export type CompanyRow = Database["public"]["Functions"]["search_organizations_filtered"]["Returns"][number];

export type SearchResult =
  | { tab: "people"; items: PersonRow[]; hasMore: boolean }
  | { tab: "companies"; items: CompanyRow[]; hasMore: boolean };

const STAFF_RANGES: Record<Exclude<StaffSize, "all">, { min: number; max?: number }> = {
  "0-10": { min: 0, max: 10 },
  "11-50": { min: 11, max: 50 },
  "51-200": { min: 51, max: 200 },
  "201+": { min: 201 },
};

// Фильтры применяются в базе до LIMIT/OFFSET, чтобы страницы выдачи оставались полными.
export async function runSearch(tab: Tab, query: string, filters: CatalogFilters, offset: number): Promise<SearchResult> {
  const supabase = createClient();
  const commonArgs = {
    p_query: query.trim(),
    // Город сравнивается без учёта регистра, целиком.
    p_city: filters.city.trim() || undefined,
    p_limit: PAGE_SIZE,
    p_offset: offset,
  };
  if (tab === "people") {
    const { data, error } = await supabase.rpc("search_people", commonArgs);
    if (error) throw error;
    return { tab, items: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE };
  }
  const range = filters.staffSize === "all" ? null : STAFF_RANGES[filters.staffSize];
  const { data, error } = await supabase.rpc("search_organizations_filtered", {
    ...commonArgs,
    p_min_members: range?.min,
    p_max_members: range?.max,
  });
  if (error) throw error;
  return { tab, items: data ?? [], hasMore: (data?.length ?? 0) === PAGE_SIZE };
}
