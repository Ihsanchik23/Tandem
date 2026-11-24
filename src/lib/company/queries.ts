// Чтение данных компании на сервере. Права решает RLS: здесь только select.
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type MemberRole = Database["public"]["Enums"]["member_role"];

export type MyCompany = {
  role: MemberRole;
  position: string | null;
  org: { id: string; slug: string; name: string; logo_url: string | null; city: string | null };
};

// Компания текущего пользователя. В пилоте одна; если когда-нибудь станет несколько —
// берём самую раннюю (переключатель компаний появится позже).
export async function getMyCompany(userId: string): Promise<MyCompany | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("role, position, organizations(id, slug, name, logo_url, city)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.organizations) return null;
  return { role: data.role, position: data.position, org: data.organizations };
}

// Есть ли у пользователя действующая подписка, ещё не привязанная к компании
// (то же условие, что проверяет create_organization). RLS отдаёт только свои подписки.
export async function hasFreeSubscription(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("owner_user_id", userId)
    .is("organization_id", null)
    .eq("status", "active")
    .gt("paid_until", new Date().toISOString())
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export type Member = {
  user_id: string;
  role: MemberRole;
  position: string | null;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
};

const ROLE_ORDER: Record<MemberRole, number> = { owner: 0, admin: 1, manager: 2, employee: 3 };

// Сотрудники компании: сначала по роли, потом по имени.
export async function getMembers(orgId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, role, position, profiles(username, first_name, last_name, avatar_url)")
    .eq("organization_id", orgId);
  const members = (data ?? []).flatMap((m) =>
    m.profiles ? [{ user_id: m.user_id, role: m.role, position: m.position, ...m.profiles }] : [],
  );
  return members.sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, "ru"),
  );
}

// id сотрудников, которые уже состоят хотя бы в одном подразделении.
// Видно только сотрудникам этой компании (RLS unit_members_select).
export async function getAssignedUserIds(orgId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("unit_members").select("user_id").eq("organization_id", orgId);
  return new Set((data ?? []).map((r) => r.user_id));
}

export function canEditCompany(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
