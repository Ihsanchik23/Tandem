// Временная страница-заглушка раздела (до нижней навигации).
type Props = { title: string; children: React.ReactNode };

export function StubPage({ title, children }: Props) {
  return (
    <main className="flex flex-1 flex-col px-5 pb-10 pt-12">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}
