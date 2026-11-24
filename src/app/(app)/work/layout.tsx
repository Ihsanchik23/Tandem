import { Suspense } from "react";
import { MobileHeader } from "@/components/nav/MobileHeader";
import { WorkPanel } from "@/components/nav/WorkPanel";
import { getShellData } from "@/lib/nav/shell";

// Раздел «Работа».
// Компьютер: слева постоянная панель компании.
// Телефон: шапка (бургер слева, заголовок по центру, логотип компании справа) и выдвижная панель.
// Остальные разделы шапки не имеют — у них свой заголовок на странице.
export default function WorkLayout({ children }: LayoutProps<"/work">) {
  return (
    <div className="flex flex-1">
      <Suspense fallback={<div className="hidden w-72 shrink-0 border-r border-ink bg-white md:block" />}>
        <PanelWithData />
      </Suspense>
      {/* Заголовок страницы на телефоне показывает шапка — дублирующий скрываем. */}
      <div className="flex min-w-0 flex-1 flex-col max-md:[&_[data-page-title]]:hidden">
        <Suspense fallback={<div className="h-14 md:hidden" aria-hidden />}>
          <HeaderWithData />
        </Suspense>
        {children}
      </div>
    </div>
  );
}

async function PanelWithData() {
  return <WorkPanel data={await getShellData()} />;
}

async function HeaderWithData() {
  return <MobileHeader data={await getShellData()} />;
}
