"use server";

// Изменение структуры. По правилам проекта Owner/Admin меняют units и unit_members напрямую —
// права (роль и активная подписка) проверяет RLS. Если RLS не пустил, update/delete
// не меняют ни одной строки — это тоже отказ.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKey } from "@/lib/i18n/ru";
import type { BranchSummary } from "./branch";
import { unitDbError, validateUnit } from "./errors";

export type UnitResult = { error?: ErrorKey };

const PATH = "/work/structure";

function done(): UnitResult {
  revalidatePath(PATH);
  revalidatePath("/work/people");
  return {};
}

export async function createUnit(input: {
  organizationId: string;
  parentId: string | null;
  name: string;
  address: string;
}): Promise<UnitResult & { id?: string }> {
  const invalid = validateUnit(input.name, input.address);
  if (invalid) return { error: invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units")
    .insert({
      organization_id: input.organizationId,
      parent_id: input.parentId,
      name: input.name.trim(),
      address: input.address.trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: unitDbError(error) };
  // id — чтобы холст сразу показал новую карточку.
  return { ...done(), id: data.id };
}

async function updateUnitRow(
  unitId: string,
  patch: { name?: string; address?: string | null; head_user_id?: string | null; parent_id?: string | null },
): Promise<UnitResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("units").update(patch).eq("id", unitId).select("id");
  if (error) return { error: unitDbError(error) };
  if (!data || data.length === 0) return { error: "forbidden" };
  return done();
}

export async function updateUnit(unitId: string, name: string, address: string): Promise<UnitResult> {
  const invalid = validateUnit(name, address);
  if (invalid) return { error: invalid };
  return updateUnitRow(unitId, { name: name.trim(), address: address.trim() || null });
}

export async function setUnitHead(unitId: string, userId: string | null): Promise<UnitResult> {
  return updateUnitRow(unitId, { head_user_id: userId });
}

export async function moveUnit(unitId: string, parentId: string | null): Promise<UnitResult> {
  return updateUnitRow(unitId, { parent_id: parentId });
}


// Что произойдёт при удалении ветки (функция базы get_unit_branch_summary).
export async function getBranchSummary(unitId: string): Promise<{ error?: ErrorKey; summary?: BranchSummary }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_unit_branch_summary", { p_unit: unitId });
  const row = data?.[0];
  if (error || !row) return { error: error ? unitDbError(error) : "notFound" };
  return {
    summary: {
      units: row.units_count,
      members: row.members_count,
      unassigned: row.will_be_unassigned,
      pages: row.pages_count,
      toArchive: row.pages_to_archive,
    },
  };
}

// Удаление подразделения со всеми вложенными (delete_unit_branch): права, подписка,
// архив страниц и порядок удаления проверяет и выполняет база в одной транзакции.
export async function deleteBranch(unitId: string): Promise<UnitResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_unit_branch", { p_unit: unitId });
  if (error) return { error: unitDbError(error) };
  return done();
}

export async function addUnitMembers(organizationId: string, unitId: string, userIds: string[]): Promise<UnitResult> {
  if (userIds.length === 0) return {};
  const supabase = await createClient();
  const { error } = await supabase
    .from("unit_members")
    .insert(userIds.map((user_id) => ({ organization_id: organizationId, unit_id: unitId, user_id })));
  if (error) return { error: unitDbError(error) };
  return done();
}

export async function removeUnitMember(unitId: string, userId: string): Promise<UnitResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unit_members")
    .delete()
    .eq("unit_id", unitId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { error: unitDbError(error) };
  if (!data || data.length === 0) return { error: "forbidden" };
  return done();
}

// Личная расстановка карточек: сохраняется целиком; {} — «вернуть на места». Страницу не перерисовываем.
export async function saveCanvasPositions(organizationId: string, positions: Record<string, [number, number]>): Promise<UnitResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_canvas_positions", { p_org: organizationId, p_positions: positions });
  return error ? { error: unitDbError(error) } : {};
}
