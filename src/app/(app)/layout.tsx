import { Suspense } from "react";
import { AppNav } from "@/components/nav/AppNav";

// Рамка разделов после входа: навигация + место под панель внизу (телефон) или слева (компьютер).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-56">
      {children}
      <Suspense fallback={null}>
        <AppNav />
      </Suspense>
    </div>
  );
}
