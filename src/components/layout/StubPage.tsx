// Страница раздела: заголовок и содержимое по ширине телефона.
type Props = { title: string; children?: React.ReactNode };

export function StubPage({ title, children }: Props) {
  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-6 md:pt-10">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {children}
      </div>
    </main>
  );
}
