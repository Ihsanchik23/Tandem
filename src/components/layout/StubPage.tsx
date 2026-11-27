// Страница раздела: заголовок и содержимое по ширине телефона.
// wide — шире на компьютере (карточки рабочих страниц в две колонки).
type Props = { title: string; wide?: boolean; children?: React.ReactNode };

export function StubPage({ title, wide = false, children }: Props) {
  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-5 md:pt-10">
      <div className={`mx-auto flex w-full flex-col gap-5 ${wide ? "max-w-lg md:max-w-3xl" : "max-w-lg"}`}>
        <h1 data-page-title className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}
