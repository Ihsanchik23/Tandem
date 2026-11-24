import { Suspense } from "react";
import { AppNav } from "@/components/nav/AppNav";
import { AppNavView } from "@/components/nav/AppNavView";
import { getUserId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Рамка разделов после входа: навигация + место под панель внизу (телефон) или слева (компьютер).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-56">
      {children}
      <Suspense fallback={<AppNavView pathname={null} myUsername={null} />}>
        <NavWithUser />
      </Suspense>
    </div>
  );
}

// Имя вошедшего нужно навигации, чтобы выделять «Профиль» только на своём профиле.
async function NavWithUser() {
  const userId = await getUserId();
  let username: string | null = null;
  if (userId) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
    username = data?.username ?? null;
  }
  return <AppNav myUsername={username} />;
}
