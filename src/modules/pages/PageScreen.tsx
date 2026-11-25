import Link from "next/link";
import { t } from "@/lib/i18n";
import { MarkSeen } from "./MarkSeen";
import { ModuleIcon } from "./PagesList";
import type { PageRow } from "./queries";

// Экран рабочей страницы. Порядок сверху вниз: о странице (название, описание, у кого доступ),
// потом содержимое модуля (вид просмотра, поиск и фильтры — внутри модуля).
// aside — справа в шапке (на компьютере). wide — для доски задач.
export function PageScreen({
  page,
  canManage,
  wide = false,
  aside,
  children,
}: {
  page: PageRow;
  canManage: boolean;
  wide?: boolean;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const p = t.pages;
  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-3 md:pt-9">
      <MarkSeen pageId={page.id} />
      <div className={`mx-auto flex w-full flex-col gap-5 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        {/* На телефоне название уже в верхней шапке, а «Настройки» — шестерёнкой там же: блок не нужен. */}
        <header className="hidden md:flex md:items-center md:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink">
              <ModuleIcon moduleKey={page.moduleKey} className="h-[22px] w-[22px]" />
            </span>
            <div className="min-w-0">
              <h1 data-page-title className="break-words text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                {page.name}
              </h1>
              <p className="mt-0.5 truncate text-[13px] text-muted">{page.description || p.modules[page.moduleKey]}</p>
            </div>
          </div>
          {aside || canManage ? (
            <div className="flex shrink-0 items-center gap-3">
              {aside}
              {canManage ? (
                <Link
                  href={`/work/p/${page.id}/settings`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-medium text-ink hover:bg-surface"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[15px] w-[15px]" aria-hidden>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                  </svg>
                  {p.settingsShort}
                </Link>
              ) : null}
            </div>
          ) : null}
        </header>
        {page.archived ? (
          <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink">{p.archivedNotice}</p>
        ) : null}
        {children ?? (
          <p className="rounded-3xl border border-dashed border-line px-4 py-8 text-center text-base text-ink">{p.chatSoon}</p>
        )}
      </div>
    </main>
  );
}
