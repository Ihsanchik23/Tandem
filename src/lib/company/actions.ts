"use server";

// Создание и изменение компании. Права проверяет база:
// - создание — функция create_organization (подписка, «одна компания», создатель = Owner);
// - изменение — RLS organizations_update (только Owner/Admin при активной подписке).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKey } from "@/lib/i18n/ru";
import {
  cleanCompanyInput,
  companyDbError,
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

  revalidatePath("/", "layout");
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

  revalidatePath("/", "layout");
  redirect(`/c/${data[0]!.slug}`);
}
