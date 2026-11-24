import { Suspense } from "react";
import { WorkPanel } from "@/components/nav/WorkPanel";
import { getShellData } from "@/lib/nav/shell";

// Раздел «Работа»: на компьютере слева постоянная панель компании (на телефоне — выдвижное меню из шапки).
export default function WorkLayout({ children }: LayoutProps<"/work">) {
  return (
    <div className="flex flex-1">
      <Suspense fallback={<div className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white md:block" />}>
        <PanelWithData />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

async function PanelWithData() {
  return <WorkPanel data={await getShellData()} />;
}
