import { Suspense } from "react";
import { StubPage } from "@/components/layout/StubPage";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

// «Главная» — пока заглушка (ТЗ, раздел 15). Сюда попадают после регистрации.
export default function HomePage() {
  return (
    <StubPage title={t.home.title}>
      <Suspense fallback={<div className="h-7 w-48 rounded-lg bg-neutral-100" />}>
        <Greeting />
      </Suspense>
      <p className="text-base text-neutral-600">{t.home.placeholder}</p>
    </StubPage>
  );
}

async function Greeting() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", userId)
    .maybeSingle();
  const name = profile?.first_name?.trim();
  return (
    <p className="text-xl text-ink">
      {t.home.greeting}
      {name ? `, ${name}` : ""}!
    </p>
  );
}
