// Страница раздела: заголовок и содержимое по ширине телефона.
import { GROUPED_BG } from "@/components/ui/groupedStyle";

// wide — шире на компьютере (карточки рабочих страниц в две колонки).
// grouped — светло-серый фон под белые карточки-группы (настройки страницы, «Сотрудники»).
type Props = { title: string; wide?: boolean; grouped?: boolean; children?: React.ReactNode };

export function StubPage({ title, wide = false, grouped = false, children }: Props) {
  return (
    <main className={`flex flex-1 flex-col px-5 pb-8 pt-5 md:pt-10 ${grouped ? GROUPED_BG : ""}`}>
      <div className={`mx-auto flex w-full flex-col gap-5 ${wide ? "max-w-lg md:max-w-3xl" : "max-w-lg"}`}>
        <h1 data-page-title className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
