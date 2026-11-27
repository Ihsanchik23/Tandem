import { Suspense } from "react";
import { MobileHeader } from "@/components/nav/MobileHeader";
import { WorkPanel } from "@/components/nav/WorkPanel";
import { MobileHeaderSkeleton, WorkPanelSkeleton } from "@/components/nav/WorkSkeletons";
import { getShellData } from "@/lib/nav/shell";
import { NewPagePanel } from "@/modules/pages/NewPagePanel";

// Раздел «Работа».
// Компьютер: слева постоянная панель компании.
// Телефон: шапка (бургер слева, заголовок по центру, логотип компании справа) и выдвижная панель.
// Остальные разделы шапки не имеют — у них свой заголовок на странице.
export default function WorkLayout({ children }: LayoutProps<"/work">) {
  return (
    <div className="flex flex-1">
      <Suspense fallback={<WorkPanelSkeleton />}>
        <PanelWithData />
      </Suspense>
      {/* Заголовок страницы на телефоне показывает шапка — дублирующий скрываем. */}
      <div className="flex min-w-0 flex-1 flex-col max-md:[&_[data-page-title]]:hidden">
        <Suspense fallback={<MobileHeaderSkeleton />}>
          <HeaderWithData />
        </Suspense>
        {children}
      </div>
      {/* «Новая страница» — панель справа поверх любого экрана «Работы» (?new-page=1). */}
      <Suspense fallback={null}>
        <NewPagePanel />
      </Suspense>
    </div>
  );
}

async function PanelWithData() {
  return <WorkPanel data={await getShellData()} />;
}

async function HeaderWithData() {
  return <MobileHeader data={await getShellData()} />;
}
