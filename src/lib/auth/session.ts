import { createClient } from "@/lib/supabase/server";

// id вошедшего пользователя (из токена сессии) или null.
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}
