"use server";

// Сохранение своего профиля. Обычный update таблицы profiles:
// RLS (profiles_update_own) разрешает менять только свою строку.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ErrorKey } from "@/lib/i18n/ru";
import {
  cleanProfileInput,
  profileDbError,
  validateProfile,
  type ProfileFieldErrors,
  type ProfileInput,
} from "./validation";

export type ProfileFormState = {
  error?: ErrorKey;
  fieldErrors?: ProfileFieldErrors;
  values?: ProfileInput;
};

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const values = cleanProfileInput({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    username: formData.get("username"),
    city: formData.get("city"),
    bio: formData.get("bio"),
  });

  const fieldErrors = validateProfile(values);
  if (Object.keys(fieldErrors).length > 0) return { error: "fixFields", fieldErrors, values };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: values.first_name,
      last_name: values.last_name,
      username: values.username,
      city: values.city || null,
      bio: values.bio || null,
    })
    .eq("id", userId);

  if (error) {
    const mapped = profileDbError(error);
    return mapped.field
      ? { error: "fixFields", fieldErrors: { [mapped.field]: mapped.key }, values }
      : { error: mapped.key, values };
  }

  redirect(`/@${values.username}`);
}
