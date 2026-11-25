"use server";

// Создание и изменение компании. Права проверяет база:
// - создание — функция create_organization (подписка, «одна компания», создатель = Owner);
// - изменение — RLS organizations_update (только Owner/Admin при активной подписке).
import { redirect } from "next/navigation";
import { revalidateCompanies, revalidateInvites, revalidateMembership, revalidateSearch, revalidateWork } from "@/lib/cache/revalidate";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKey } from "@/lib/i18n/ru";
import {
  cleanCompanyInput,
  companyDbError,
  LIMITS,
  validateCompany,
  type CompanyFieldErrors,
  type CompanyInput,
} from "./validation";

export type CompanyFormState = {
  error?: ErrorKey;
  fieldErrors?: CompanyFieldErrors;
  values?: CompanyInput;
};

function readInput(formData: FormData): CompanyInput {
  return cleanCompanyInput({
    name: formData.get("name"),
    slug: formData.get("slug"),
    city: formData.get("city"),
    description: formData.get("description"),
  });
}

function dbFailure(error: { code?: string | null; message?: string | null }, values: CompanyInput): CompanyFormState {
  const mapped = companyDbError(error);
  return mapped.field
    ? { error: "fixFields", fieldErrors: { [mapped.field]: mapped.key }, values }
    : { error: mapped.key, values };
}

export async function createCompany(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const values = readInput(formData);
  const fieldErrors = validateCompany(values, { withSlug: true });
  if (Object.keys(fieldErrors).length > 0) return { error: "fixFields", fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    p_name: values.name,
    p_slug: values.slug,
    p_description: values.description || undefined,
    p_city: values.city || undefined,
  });
  if (error) return dbFailure(error, values);

  revalidateMembership();
  redirect("/work");
}

export async function updateCompany(_prev: CompanyFormState, formData: FormData): Promise<CompanyFormState> {
  const orgId = formData.get("organization_id");
  const values = readInput(formData);
  const fieldErrors = validateCompany(values, { withSlug: false });
  if (Object.keys(fieldErrors).length > 0) return { error: "fixFields", fieldErrors, values };
  if (typeof orgId !== "string" || !orgId) return { error: "generic", values };

  const supabase = await createClient();
  // Меняем только разрешённые поля. Адрес страницы (slug) после создания не меняется.
  const { data, error } = await supabase
    .from("organizations")
    .update({ name: values.name, city: values.city || null, description: values.description || null })
    .eq("id", orgId)
    .select("slug");
  if (error) return dbFailure(error, values);
  // RLS не пустил: не Owner/Admin или подписка истекла — строка не изменилась.
  if (!data || data.length === 0) return { error: "forbidden", values };

  revalidateWork();
  revalidateCompanies();
  revalidateSearch();
  redirect(`/c/${data[0]!.slug}`);
}

// ---------- Сотрудники, выход, приглашения ----------
// Права проверяют функции базы; здесь только вызов и перевод ошибок в понятный текст.

export type ActionState = { error?: ErrorKey; done?: number };

function str(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function failed(error: { code?: string | null; message?: string | null }): ActionState {
  return { error: companyDbError(error).key };
}

const ROLES = ["admin", "manager", "employee"] as const;

export async function setMemberRole(prev: ActionState, formData: FormData): Promise<ActionState> {
  const role = str(formData, "role");
  if (!(ROLES as readonly string[]).includes(role)) return { error: "invalidRole" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_org: str(formData, "organization_id"),
    p_user: str(formData, "user_id"),
    p_role: role as (typeof ROLES)[number],
  });
  if (error) return failed(error);
  revalidateWork();
  return { done: (prev.done ?? 0) + 1 };
}

export async function setMemberPosition(prev: ActionState, formData: FormData): Promise<ActionState> {
  const position = str(formData, "position");
  if (position.length > LIMITS.position) return { error: "positionTooLong" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_position", {
    p_org: str(formData, "organization_id"),
    p_user: str(formData, "user_id"),
    p_position: position,
  });
  if (error) return failed(error);
  revalidateMembership();
  return { done: (prev.done ?? 0) + 1 };
}

export async function removeMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_member", {
    p_org: str(formData, "organization_id"),
    p_user: str(formData, "user_id"),
  });
  if (error) return failed(error);
  revalidateMembership();
  redirect("/work/people");
}

export async function leaveCompany(): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_organization");
  if (error) return failed(error);
  revalidateMembership();
  redirect("/work?notice=left");
}

// Новая ссылка-приглашение. У компании всегда одна действующая ссылка:
// сначала создаём новую, и только если это удалось — отзываем все остальные действующие.
export async function createInvite(prev: ActionState, formData: FormData): Promise<ActionState> {
  const orgId = str(formData, "organization_id");
  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("create_invite", { p_org: orgId });
  if (error || !token) return failed(error ?? {});

  const { data: others, error: listErr } = await supabase
    .from("invites")
    .select("id")
    .eq("organization_id", orgId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .neq("token", token);
  let revokeFailed = !!listErr;
  for (const inv of others ?? []) {
    const { error: revErr } = await supabase.rpc("revoke_invite", { p_invite: inv.id });
    if (revErr) revokeFailed = true;
  }

  revalidateWork();
  revalidateInvites();
  // Новая ссылка создана в любом случае; если старую отозвать не вышло — говорим об этом.
  return revokeFailed ? { error: "inviteOldNotRevoked", done: (prev.done ?? 0) + 1 } : { done: (prev.done ?? 0) + 1 };
}

export async function revokeInvite(prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invite", { p_invite: str(formData, "invite_id") });
  if (error) return failed(error);
  revalidateWork();
  revalidateInvites();
  return { done: (prev.done ?? 0) + 1 };
}

export async function acceptInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { p_token: str(formData, "token") });
  if (error?.message === "already_member_here") redirect("/work");
  if (error) return failed(error);
  revalidateMembership();
  redirect("/work?notice=joined");
}
