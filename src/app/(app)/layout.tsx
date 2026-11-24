import { Suspense } from "react";
import { AppNav } from "@/components/nav/AppNav";
import { AppNavView } from "@/components/nav/AppNavView";
import { MobileHeader } from "@/components/nav/MobileHeader";
import { getShellData } from "@/lib/nav/shell";

// Рамка разделов после входа.
// Телефон: шапка сверху (бургер, заголовок, логотип компании) и панель разделов снизу.
// Компьютер: узкое меню из иконок слева (раскрывается при наведении).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-16">
      <Suspense fallback={<MobileHeaderFallback />}>
        <HeaderWithData />
      </Suspense>
      {children}
      <Suspense fallback={<AppNavView pathname={null} myUsername={null} />}>
        <NavWithUser />
      </Suspense>
    </div>
  );
}

async function HeaderWithData() {
  return <MobileHeader data={await getShellData()} />;
}

// Имя вошедшего нужно навигации, чтобы выделять «Профиль» только на своём профиле.
async function NavWithUser() {
  const { username } = await getShellData();
  return <AppNav myUsername={username} />;
}

function MobileHeaderFallback() {
  return <div className="h-14 border-b border-neutral-200 md:hidden" aria-hidden />;
}
