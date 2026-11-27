import type { ReactNode } from "react";

// Раскладка «список слева — содержимое справа» («Поиск», «Сообщения»).
// Компьютер: каждая колонка прокручивается сама. Заголовок слева стоит на месте; шапку списка
// (вкладки, поиск) список закрепляет сам через sticky. Справа — выбранное или фото-панель.
// Боковые отступы списка увеличены: аватарки не прижимаются к меню слева.
// Телефон: только список на весь экран, обычная прокрутка страницы; правой области нет.
type Props = {
  title: string;
  /** Подпись правой области для экранных чтецов. */
  detailLabel: string;
  list: ReactNode;
  detail: ReactNode;
};

export function ListDetailLayout({ title, detailLabel, list, detail }: Props) {
  return (
    <main className="flex min-h-0 flex-1 flex-col md:h-dvh md:flex-row md:overflow-hidden">
      <section
        aria-label={title}
        className="flex min-w-0 flex-col md:min-h-0 md:w-[400px] md:shrink-0 md:border-r-[0.5px] md:border-neutral-300 xl:w-[460px]"
      >
        <h1 className="shrink-0 px-5 pb-5 pt-5 text-2xl font-semibold tracking-tight text-ink md:px-8 md:pt-8">{title}</h1>
        {/* stable gutter: ширина колонки не прыгает, когда появляется полоса прокрутки. */}
        <div className="flex min-w-0 flex-col px-5 pb-8 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:px-8 md:[scrollbar-gutter:stable]">
          {list}
        </div>
      </section>
      <section aria-label={detailLabel} className="hidden min-w-0 flex-1 overflow-y-auto overscroll-contain md:flex">
        {detail}
      </section>
    </main>
  );
}
