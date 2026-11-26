import { MenuIcon } from "./icons";

// Заготовки рамки «Работы», пока загружаются данные компании.
// Тот же размер и фон, что у настоящих панели и шапки, — ничего не сдвигается и не мигает белым.

// Компьютер: панель компании слева (как WorkPanel + CompanyPanel).
export function WorkPanelSkeleton() {
  return (
    <aside aria-hidden className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r-[0.5px] border-line bg-white md:block">
      <div className="px-3 pb-2 pt-4">
        <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-100 bg-white p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <span className="h-9 w-9 shrink-0 rounded-full bg-neutral-100" />
          <span className="flex flex-1 flex-col gap-1.5">
            <span className="h-3.5 w-2/3 rounded bg-neutral-100" />
            <span className="h-3 w-1/3 rounded bg-neutral-100" />
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-3 py-3">
        {[3, 3, 1].map((rows, section) => (
          <div key={section} className="flex flex-col gap-1">
            <span className="mx-2.5 mb-1.5 h-3 w-24 rounded bg-neutral-200/70" />
            {Array.from({ length: rows }, (_, i) => (
              <span key={i} className="flex h-14 items-center gap-3 px-2.5">
                <span className="h-10 w-10 rounded-full bg-neutral-200/70" />
                <span className="h-3.5 w-32 rounded bg-neutral-200/70" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

// Телефон: шапка «Работы» (бургер и заголовок) — как MobileHeader.
export function MobileHeaderSkeleton() {
  return (
    <div
      aria-hidden
      className="sticky top-0 z-30 grid h-14 grid-cols-[3rem_1fr_3rem] items-center bg-white/95 px-2 pt-[env(safe-area-inset-top)] md:hidden"
    >
      <span className="flex h-11 w-11 items-center justify-center text-ink">
        <MenuIcon className="h-6 w-6" />
      </span>
      <span className="mx-auto h-4 w-24 rounded bg-neutral-100" />
      <span />
    </div>
  );
}
