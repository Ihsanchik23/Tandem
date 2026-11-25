import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GuestScreen } from "@/components/guest/GuestScreen";
import { getUserId } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: `${t.profile.title} — ${t.app.name}` };

// Кнопка «Профиль» в навигации: вошедшего ведёт на свой /@username,
// гостю (без входа) показывает гостевой экран.
export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <MyProfile />
    </Suspense>
  );
}

async function MyProfile() {
  const userId = await getUserId();
  if (!userId) return <GuestScreen section="profile" />;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  redirect(profile ? `/@${profile.username}` : "/");
}
