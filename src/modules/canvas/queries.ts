// Данные для холста. Подразделения видят все сотрудники компании (RLS units_select, unit_members_select).
import { createClient } from "@/lib/supabase/server";
import type { UnitMemberRow, UnitRow } from "./tree";

export async function getStructure(orgId: string): Promise<{ units: UnitRow[]; unitMembers: UnitMemberRow[] }> {
  const supabase = await createClient();
  const [{ data: units }, { data: unitMembers }] = await Promise.all([
    supabase.from("units").select("id, parent_id, name, address, head_user_id, created_at").eq("organization_id", orgId),
    supabase.from("unit_members").select("unit_id, user_id").eq("organization_id", orgId),
  ]);
  return { units: units ?? [], unitMembers: unitMembers ?? [] };
}

// Своя расстановка карточек (RLS отдаёт только свою строку). {} — автораскладка.
export async function getMyCanvasPositions(orgId: string): Promise<Record<string, [number, number]>> {
  const supabase = await createClient();
  const { data } = await supabase.from("canvas_prefs").select("positions").eq("organization_id", orgId).maybeSingle();
  const raw = data?.positions;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, [number, number]>) : {};
}
