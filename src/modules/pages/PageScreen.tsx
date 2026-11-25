import Link from "next/link";
import { t } from "@/lib/i18n";
import { MarkSeen } from "./MarkSeen";
import { ModuleIcon } from "./PagesList";
import type { PageRow } from "./queries";

// Экран рабочей страницы: заголовок, настройки (для тех, кто может), содержимое модуля.
// wide — для доски задач: три колонки на компьютере.
export function PageScreen({
  page,
  canManage,
  wide = false,
  children,
}: {
  page: PageRow;
  canManage: boolean;
  wide?: boolean;
  children?: React.ReactNode;
}) {
  const p = t.pages;
  return (
    <main className="flex flex-1 flex-col px-5 pb-8 pt-5 md:pt-10">
      <MarkSeen pageId={page.id} />
      <div className={`mx-auto flex w-full flex-col gap-5 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              page.moduleKey === "tasks" ? "bg-accent/10 text-accent" : "bg-neutral-100 text-ink"
            }`}
          >
            <ModuleIcon moduleKey={page.moduleKey} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 data-page-title className="break-words text-2xl font-semibold tracking-tight text-ink">
              {page.name}
            </h1>
            <p className="text-sm text-ink">{page.description || p.modules[page.moduleKey]}</p>
          </div>
          {canManage ? (
            <Link
              href={`/work/p/${page.id}/settings`}
              className="shrink-0 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-ink hover:bg-neutral-50"
            >
              {p.settingsShort}
            </Link>
          ) : null}
        </div>
        {page.archived ? (
          <p className="rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-ink">{p.archivedNotice}</p>
        ) : null}
        {children ?? (
          <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-8 text-center text-base text-ink">
            {p.chatSoon}
          </p>
        )}
      </div>
    </main>
  );
}
