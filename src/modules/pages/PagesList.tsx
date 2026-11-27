"use client";

import Link from "next/link";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { PlusIcon, SearchIcon } from "@/components/nav/icons";
import { ChoiceChips, FilterMenu, FilterSection } from "@/components/ui/filters/FilterMenu";
import { PageIcon } from "@/components/ui/PageIcon";
import { filterPages, isNewPage, PAGE_MODULES, sortPages, type ModuleKey } from "./logic";
import { openNewPage } from "./newPage";
import { useSeenPages } from "./seen";

export type ListPage = { id: string; name: string; description: string | null; moduleKey: ModuleKey; createdAt: string; archived: boolean };

function sameAsModule(name: string, moduleLabel: string): boolean {
  return name.trim().toLocaleLowerCase("ru") === moduleLabel.trim().toLocaleLowerCase("ru");
}

export function NewBadge() {
  return (
    <span className="animate-fade-in shrink-0 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">
      {t.pages.badgeNew}
    </span>
  );
}

// «Рабочие страницы»: только доступные, новые сверху, поиск и фильтр по модулю (общий FilterMenu).
// archive — список на странице «Архив» (раздел «Прочее»): только архивные, без заголовка и «+».
export function PagesList({ pages, canCreate, archive = false }: { pages: ListPage[]; canCreate: boolean; archive?: boolean }) {
  const p = t.pages;
  const seen = useSeenPages();
  const [query, setQuery] = useState("");
  const [module, setModule] = useState<ModuleKey | "all">("all");

  const inTab = pages.filter((x) => x.archived === archive);
  // «Новые сверху» считаем только в браузере (нужны память устройства и текущее время);
  // при сборке на сервере — просто свежие раньше старых.
  const sorted = seen ? sortPages(inTab, seen) : [...inTab].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shown = filterPages(sorted, query, module);

  return (
    <section className="flex flex-col gap-4">
      {archive ? null : (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{p.title}</h2>
          {canCreate ? (
            <a
              href="/work?new-page=1"
              onClick={(e) => openNewPage(e)}
              aria-label={p.create}
              title={p.create}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover"
            >
              <PlusIcon className="h-5 w-5" />
            </a>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{p.searchPlaceholder}</span>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={p.searchPlaceholder}
            className="h-11 w-full rounded-full border-0 bg-neutral-100 pl-12 pr-4 text-base text-ink placeholder:text-neutral-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <FilterMenu count={module === "all" ? 0 : 1} onReset={() => setModule("all")} iconOnly>
          <FilterSection title={p.filterModule} value={module === "all" ? p.filterAll : p.modules[module]}>
            <ChoiceChips
              label={p.filterModule}
              value={module}
              onChange={setModule}
              options={(["all", ...PAGE_MODULES] as const).map((m) => ({ value: m, label: m === "all" ? p.filterAll : p.modules[m] }))}
            />
          </FilterSection>
        </FilterMenu>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-6 text-center text-base text-ink">
          {inTab.length === 0 ? (archive ? p.emptyArchive : p.empty) : p.emptySearch}
        </p>
      ) : (
        // Карточки: на компьютере в две колонки, на телефоне — одна.
        <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3">
          {shown.map((page) => {
            const type = p.modules[page.moduleKey];
            return (
              <li key={page.id} className="min-w-0">
                <Link
                  href={`/work/p/${page.id}`}
                  className="flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition-[background-color,border-color,box-shadow] duration-150 hover:border-neutral-300 hover:bg-surface hover:shadow-[0_4px_16px_-8px_rgba(30,30,30,0.18)]"
                >
                  <PageIcon moduleKey={page.moduleKey} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base font-medium text-ink">{page.name}</span>
                      {seen && !archive && isNewPage(page, seen) ? <NewBadge /> : null}
                    </span>
                    {/* Тип модуля не повторяем, если название и есть тип («Задачи / Задачи»). */}
                    {!sameAsModule(page.name, type) ? <span className="block truncate text-sm text-muted">{type}</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
