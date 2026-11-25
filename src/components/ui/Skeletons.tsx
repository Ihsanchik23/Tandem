// Заготовки содержимого на время загрузки — той же формы и размера, что настоящее,
// чтобы страница не была пустой и ничего не прыгало, когда придут данные.

/** Строки списка людей: круглое фото слева и две строки текста (как MemberRow). */
export function RowsSkeleton({ rows = 5, avatar = 44 }: { rows?: number; avatar?: number }) {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <span className="shrink-0 rounded-full bg-neutral-100" style={{ width: avatar, height: avatar }} />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-1/2 rounded bg-neutral-100" />
            <span className="h-3 w-1/3 rounded bg-neutral-100" />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Рабочая страница (PageScreen): шапка со значком и названием на компьютере, затем строки. */
export function WorkPageSkeleton() {
  return (
    <main aria-hidden className="flex flex-1 flex-col px-5 pb-8 pt-3 md:pt-9">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="hidden items-center gap-3 md:flex">
          <span className="h-11 w-11 shrink-0 rounded-2xl bg-surface" />
          <span className="flex flex-col gap-2">
            <span className="h-6 w-56 rounded bg-neutral-100" />
            <span className="h-3 w-32 rounded bg-neutral-100" />
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="h-16 rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    </main>
  );
}
