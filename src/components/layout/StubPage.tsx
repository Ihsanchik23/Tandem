// Страница раздела: заголовок и содержимое по ширине телефона.
type Props = { title: string; children?: React.ReactNode };

export function StubPage({ title, children }: Props) {
  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-5 md:pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
        {/* На телефоне заголовок показывает шапка. */}
        <h1 className="hidden text-2xl font-semibold tracking-tight text-ink md:block">{title}</h1>
        {children}
      </div>
    </main>
  );
}
