import type { ReactNode } from "react";
import { t } from "@/lib/i18n";
import { BrandMark } from "@/components/ui/BrandMark";
import { AuthSlideshow } from "./AuthSlideshow";

// Каркас экранов входа и регистрации.
// Компьютер (от 1024px): слева слайд-шоу в карточке, справа форма по центру.
// Телефон: только форма; сверху — стрелка «назад» (back).
// Используется в (auth)/layout.tsx и на гостевых экранах разделов на компьютере.
export function AuthShell({ children, back }: { children: ReactNode; back?: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-1 bg-canvas">
      <div className="sticky top-0 hidden h-dvh w-1/2 shrink-0 p-4 lg:flex">
        <AuthSlideshow />
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        {back ? <div className="px-2 pt-2 lg:hidden">{back}</div> : null}
        <div className="flex flex-1 flex-col items-center px-5 pb-10 pt-6 lg:justify-center lg:py-12">
          {/* На телефоне колонка тянется на всю высоту: ссылка «Нет аккаунта?» прижата к низу (класс auth-bottom). */}
          <div className="flex w-full max-w-[360px] flex-col gap-6 max-lg:flex-1">
            <p className="flex items-center justify-center gap-2.5 text-xl font-semibold tracking-tight text-ink">
              <BrandMark size={32} className="h-8 w-8" />
              {t.app.name}
            </p>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
