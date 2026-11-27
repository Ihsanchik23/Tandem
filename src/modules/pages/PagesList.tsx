"use client";

import Link from "next/link";
import { useState } from "react";
import { t } from "@/lib/i18n";
import { PlusIcon } from "@/components/nav/icons";
import { PageIcon } from "@/components/ui/PageIcon";
import { filterPages, isNewPage, PAGE_MODULES, sortPages, type ModuleKey } from "./logic";
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

// «Рабочие страницы»: только доступные, новые сверху, поиск, фильтр по модулю.
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
  const chip = (active: boolean) =>
    `h-9 rounded-full px-4 text-sm font-medium transition-colors ${active ? "bg-ink text-white" : "bg-neutral-100 text-ink hover:bg-neutral-200"}`;

  return (
    <section className="flex flex-col gap-4">
      {archive ? null : (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{p.title}</h2>
          {canCreate ? (
            <Link
              href="/work/pages/new"
              aria-label={p.create}
              title={p.create}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-hover"
            >
              <PlusIcon className="h-5 w-5" />
            </Link>
          ) : null}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={p.searchPlaceholder}
        aria-label={p.searchPlaceholder}
        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base text-ink placeholder:text-neutral-400 focus:border-accent focus:outline-none"
      />
      <div className="flex gap-2">
        {(["all", ...PAGE_MODULES] as const).map((m) => (
          <button key={m} type="button" onClick={() => setModule(m)} className={chip(module === m)}>
            {m === "all" ? p.filterAll : p.modules[m]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 px-4 py-6 text-center text-base text-ink">
          {inTab.length === 0 ? (archive ? p.emptyArchive : p.empty) : p.emptySearch}
        </p>
      ) : (
        <ul className="flex flex-col">
          {shown.map((page) => (
            <li key={page.id}>
              <Link href={`/work/p/${page.id}`} className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-neutral-50">
                <PageIcon moduleKey={page.moduleKey} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-base font-medium text-ink">{page.name}</span>
                    {seen && !archive && isNewPage(page, seen) ? <NewBadge /> : null}
                  </span>
                  {/* Тип модуля под названием не повторяем, если название и есть тип («Задачи / Задачи»). */}
                  {page.description || !sameAsModule(page.name, p.modules[page.moduleKey]) ? (
                    <span className="block truncate text-sm text-ink">{page.description || p.modules[page.moduleKey]}</span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
