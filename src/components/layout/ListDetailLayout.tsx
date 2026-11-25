import type { ReactNode } from "react";

// Раскладка «список слева — содержимое справа» («Поиск», «Сообщения»).
// Компьютер: слева панель с заголовком страницы и списком, справа — выбранное или фото-панель.
// Телефон: только список на весь экран; правой области нет.
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
      <section aria-label={title} className="flex min-w-0 flex-col px-4 pb-8 pt-5 md:w-[400px] md:shrink-0 md:overflow-y-auto md:border-r-[0.5px] md:border-neutral-300 md:px-5 md:pt-8 xl:w-[460px]">
        <h1 className="mb-5 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {list}
      </section>
      <section aria-label={detailLabel} className="hidden min-w-0 flex-1 overflow-y-auto md:flex">
        {detail}
      </section>
    </main>
  );
}
