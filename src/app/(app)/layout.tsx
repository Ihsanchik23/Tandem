import { Suspense } from "react";
import { AppNav } from "@/components/nav/AppNav";
import { AppNavView } from "@/components/nav/AppNavView";
import { getShellData } from "@/lib/nav/shell";

// Рамка разделов после входа.
// Телефон: панель разделов снизу (шапка с бургером — только в «Работе», см. work/layout.tsx).
// Компьютер: узкое меню из иконок слева (раскрывается при наведении).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-16">
      {children}
      <Suspense fallback={<AppNavView pathname={null} myUsername={null} />}>
        <NavWithUser />
      </Suspense>
    </div>
  );
}

// Имя вошедшего нужно навигации, чтобы выделять «Профиль» только на своём профиле.
async function NavWithUser() {
  const { userId, username } = await getShellData();
  return <AppNav myUsername={username} isGuest={!userId} />;
}
