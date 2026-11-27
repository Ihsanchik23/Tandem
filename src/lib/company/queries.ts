// Чтение данных компании на сервере. Права решает RLS: здесь только select.
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { InviteRow } from "./invite";

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
  joined_at: string; // когда вступил в компанию
};

const ROLE_ORDER: Record<MemberRole, number> = { owner: 0, admin: 1, manager: 2, employee: 3 };

// Сотрудники компании: сначала по роли, потом по имени.
export async function getMembers(orgId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, role, position, created_at, profiles(username, first_name, last_name, avatar_url)")
    .eq("organization_id", orgId);
  const members = (data ?? []).flatMap((m) =>
    m.profiles ? [{ user_id: m.user_id, role: m.role, position: m.position, joined_at: m.created_at, ...m.profiles }] : [],
  );
  return members.sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`, "ru"),
  );
}

export { canEditCompany } from "./permissions";

// Один сотрудник компании (для карточки).
export async function getMember(orgId: string, userId: string): Promise<Member | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, role, position, created_at, profiles(username, first_name, last_name, avatar_url)")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.profiles) return null;
  return { user_id: data.user_id, role: data.role, position: data.position, joined_at: data.created_at, ...data.profiles };
}

// Действующие ссылки-приглашения. Видят только Owner и Admin (RLS invites_select).
export async function getActiveInvites(orgId: string): Promise<InviteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invites")
    .select("id, token, expires_at, revoked_at")
    .eq("organization_id", orgId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Оплаченные места. Видит только Owner (RLS subscriptions_select); остальным — null.
export async function getSeats(orgId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("seats")
    .eq("organization_id", orgId)
    .order("paid_until", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.seats ?? null;
}

export type QuickStartState = { hasUnits: boolean; hasPeople: boolean; hasPages: boolean };

// «Быстрый старт» владельца: есть ли подразделения, люди кроме владельца, страницы.
export async function getQuickStartState(orgId: string, ownerId: string): Promise<QuickStartState> {
  const supabase = await createClient();
  const [units, people, pages] = await Promise.all([
    supabase.from("units").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("memberships").select("user_id", { count: "exact", head: true }).eq("organization_id", orgId).neq("user_id", ownerId),
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);
  return { hasUnits: (units.count ?? 0) > 0, hasPeople: (people.count ?? 0) > 0, hasPages: (pages.count ?? 0) > 0 };
}
